import { normalizeArabic, isArabicText } from "./arabicNormalize.js";
import { topics } from "../data/topics.js";

let quranIndexPromise = null;
let contentIndexPromise = null;
let uniqueWordsCache = null;

// Fetches and caches public/data/search-index.json (Qur'an verses) for the
// session, adding normalized fields and a common {type, label, link} shape
// client-side (kept out of the JSON file to roughly halve its download size).
export function loadSearchIndex() {
  if (!quranIndexPromise) {
    quranIndexPromise = fetch("/data/search-index.json")
      .then((res) => res.json())
      .then((raw) => {
        for (const v of raw) {
          v.type = "quran";
          v.label = `Qur'an ${v.surah}:${v.ayah}`;
          v.arabicNorm = normalizeArabic(v.arabic);
          v.translationLower = (v.translation || "").toLowerCase();
          v.link = `/surah/${v.surah}#ayah-${v.ayah}`;
        }
        return raw;
      });
  }
  return quranIndexPromise;
}

// Fetches and caches public/data/content-index.json (Mutoon body text and
// standalone Hadith entries), built by scripts/build-content-index.mjs.
export function loadContentIndex() {
  if (!contentIndexPromise) {
    contentIndexPromise = fetch("/data/content-index.json")
      .then((res) => res.json())
      .then((raw) => {
        for (const v of raw) {
          v.arabicNorm = normalizeArabic(v.arabic || "");
          v.translationLower = (v.translation || "").toLowerCase();
        }
        return raw;
      });
  }
  return contentIndexPromise;
}

async function loadCombined() {
  const [quran, content] = await Promise.all([loadSearchIndex(), loadContentIndex()]);
  return [...quran, ...content];
}

export function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 4) return 99; // cheap early-out
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// How many edits (insert/delete/substitute) we tolerate before two strings
// stop being considered "the same word/phrase, just mistyped" — scales with
// length so short words aren't over-matched and long phrases still tolerate
// a couple of typos.
export function fuzzyThreshold(len) {
  if (len <= 5) return 1;
  if (len <= 12) return 2;
  return 3;
}

// Below this length, an edit distance of even 1 represents too large a
// fraction of the string to reliably mean "the same word, just mistyped"
// (e.g. "الأب" vs "الصبر" are 2 edits apart but unrelated words) — so short
// strings are only matched by substring, never by fuzzy distance.
const MIN_FUZZY_LEN = 4;

export function isFuzzyMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < MIN_FUZZY_LEN || b.length < MIN_FUZZY_LEN) return false;
  const threshold = fuzzyThreshold(Math.max(a.length, b.length));
  if (Math.abs(a.length - b.length) > threshold) return false;
  return levenshtein(a, b) <= threshold;
}

// Builds the corpus of unique words (English translation words + normalized
// Arabic words) across every indexed item, used to correct likely typos in
// a query to the nearest real word actually present in the content.
function getUniqueWords(index) {
  if (uniqueWordsCache) return uniqueWordsCache;
  const enSet = new Set();
  const arSet = new Set();
  for (const v of index) {
    for (const w of (v.translationLower || "").split(/[^a-z']+/)) {
      if (w.length >= 4) enSet.add(w);
    }
    for (const w of (v.arabicNorm || "").split(/\s+/)) {
      if (w.length >= 3) arSet.add(w);
    }
  }
  uniqueWordsCache = { en: Array.from(enSet), ar: Array.from(arSet) };
  return uniqueWordsCache;
}

// Finds the closest known corpus word to a (possibly misspelled) query word,
// within its fuzzy-match threshold, to give typo tolerance without a full
// spellchecker. Works for both English words and normalized Arabic words.
export function correctWord(word, wordList, minLen) {
  if (word.length < minLen) return word;
  const threshold = fuzzyThreshold(word.length);
  let best = null;
  let bestDist = threshold + 1;
  for (const w of wordList) {
    if (Math.abs(w.length - word.length) > threshold) continue;
    const d = levenshtein(word, w);
    if (d < bestDist) {
      bestDist = d;
      best = w;
      if (d === 0) break;
    }
  }
  return bestDist <= threshold ? best : word;
}

// Returns topics whose keyword lists (English, Arabic, or transliteration)
// match the query — with typo tolerance — so a concept search like "dealing
// with hardship", "sabr", or a misspelled "tawhed"/"tawheeed" surfaces the
// right pre-tagged topic even with no exact literal overlap.
export function searchTopics(query) {
  const q = query.trim();
  if (!q) return [];
  const qArabic = normalizeArabic(q);
  const qLower = q.toLowerCase();

  return topics.filter((topic) => {
    if (isArabicText(q)) {
      const arKeywords = [topic.ar, ...topic.keywords.ar].map(normalizeArabic);
      return arKeywords.some(
        (k) => k.includes(qArabic) || qArabic.includes(k) || isFuzzyMatch(qArabic, k)
      );
    }
    const enKeywords = [topic.en.toLowerCase(), ...topic.keywords.en, ...topic.keywords.translit];
    return enKeywords.some(
      (k) => k.includes(qLower) || qLower.includes(k) || isFuzzyMatch(qLower, k)
    );
  });
}

// Finds every indexed item (Qur'an, Mutoon, Hadith) whose own Arabic or
// English text contains one of a topic's keywords — i.e. concept coverage
// that isn't limited to the Qur'an's hand-curated topicTags mapping, and
// isn't limited to the user's literal query word either.
function topicContentMatches(topic, index) {
  const enKeywords = [topic.en.toLowerCase(), ...topic.keywords.en, ...topic.keywords.translit];
  const arKeywords = [topic.ar, ...topic.keywords.ar].map(normalizeArabic);
  return index.filter((v) => {
    const enHit = v.translationLower && enKeywords.some((k) => v.translationLower.includes(k));
    const arHit = v.arabicNorm && arKeywords.some((k) => v.arabicNorm.includes(k));
    return enHit || arHit;
  });
}

// Literal keyword/root search across the whole corpus (Qur'an + Mutoon +
// Hadith). Handles Arabic (diacritic-insensitive) and English
// (case-insensitive, multi-word AND) queries, retrying with typo-corrected
// words when the exact query has no hits.
export function searchLiteral(query, index, uniqueWords) {
  const q = query.trim();
  if (!q) return [];

  if (isArabicText(q)) {
    const qNorm = normalizeArabic(q);
    const exact = index.filter((v) => v.arabicNorm && v.arabicNorm.includes(qNorm));
    if (exact.length > 0) return exact;

    const words = qNorm.split(/\s+/).filter(Boolean);
    const corrected = words.map((w) => correctWord(w, uniqueWords.ar, 3));
    if (corrected.join(" ") === words.join(" ")) return [];
    return index.filter((v) => v.arabicNorm && corrected.every((w) => v.arabicNorm.includes(w)));
  }

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const exact = index.filter((v) => words.every((w) => (v.translationLower || "").includes(w)));
  if (exact.length > 0) return exact;

  // No exact hits — retry with each word corrected to its closest known
  // corpus word to tolerate simple typos ("tawhed"/"tawheeed" -> "tawheed").
  const corrected = words.map((w) => correctWord(w, uniqueWords.en, 4));
  if (corrected.join(" ") === words.join(" ")) return [];
  return index.filter((v) => corrected.every((w) => (v.translationLower || "").includes(w)));
}

// Runs both search levels across the combined Qur'an + Mutoon + Hadith
// corpus and groups results: one section per matched topic (curated Qur'an
// tags plus live concept/keyword matches across all content), plus a
// "Keyword Matches" section for literal hits not already covered by a
// matched topic — never a flat list.
export async function runSearch(query) {
  const [quranIndex, contentIndex] = await Promise.all([loadSearchIndex(), loadContentIndex()]);
  const combined = [...quranIndex, ...contentIndex];
  const uniqueWords = getUniqueWords(combined);

  const matchedTopics = searchTopics(query);
  const keyOf = (v) => v.link;
  const shown = new Set();

  const topicGroups = matchedTopics.map((topic) => {
    const curated = quranIndex.filter((v) => v.topics && v.topics.includes(topic.id));
    const conceptMatches = topicContentMatches(topic, combined);
    const merged = [];
    const seen = new Set();
    for (const v of [...curated, ...conceptMatches]) {
      if (seen.has(keyOf(v))) continue;
      seen.add(keyOf(v));
      merged.push(v);
    }
    for (const v of merged) shown.add(keyOf(v));
    return { topic, results: merged };
  });

  const literal = searchLiteral(query, combined, uniqueWords)
    .filter((v) => !shown.has(keyOf(v)))
    .slice(0, 50);

  return {
    topicGroups,
    literalMatches: literal,
    isEmpty: topicGroups.every((g) => g.results.length === 0) && literal.length === 0,
  };
}
