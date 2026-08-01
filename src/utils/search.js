import { normalizeArabic, isArabicText } from "./arabicNormalize.js";
import { topics } from "../data/topics.js";

let indexPromise = null;
let uniqueWordsCache = null;

// Fetches and caches public/data/search-index.json for the session, adding
// the normalized fields client-side (kept out of the JSON file to roughly
// halve its download size).
export function loadSearchIndex() {
  if (!indexPromise) {
    indexPromise = fetch("/data/search-index.json")
      .then((res) => res.json())
      .then((raw) => {
        for (const v of raw) {
          v.arabicNorm = normalizeArabic(v.arabic);
          v.translationLower = (v.translation || "").toLowerCase();
        }
        return raw;
      });
  }
  return indexPromise;
}

function getUniqueWords(index) {
  if (uniqueWordsCache) return uniqueWordsCache;
  const set = new Set();
  for (const v of index) {
    for (const w of v.translationLower.split(/[^a-z']+/)) {
      if (w.length >= 4) set.add(w);
    }
  }
  uniqueWordsCache = Array.from(set);
  return uniqueWordsCache;
}

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99; // cheap early-out
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

// Finds the closest known corpus word to a (possibly misspelled) query word,
// within edit distance 1, to give typo tolerance without a full spellchecker.
function correctWord(word, uniqueWords) {
  if (word.length < 4) return word;
  let best = null;
  let bestDist = 2;
  for (const w of uniqueWords) {
    const d = levenshtein(word, w);
    if (d < bestDist) {
      bestDist = d;
      best = w;
      if (d === 0) break;
    }
  }
  return best || word;
}

// Returns topics whose keyword lists (English, Arabic, or transliteration)
// match the query, so a concept search like "dealing with hardship" or
// "sabr" surfaces the right pre-tagged topic even with no literal overlap.
export function searchTopics(query) {
  const q = query.trim();
  if (!q) return [];
  const qArabic = normalizeArabic(q);
  const qLower = q.toLowerCase();

  return topics.filter((topic) => {
    if (isArabicText(q)) {
      const arKeywords = [topic.ar, ...topic.keywords.ar].map(normalizeArabic);
      return arKeywords.some((k) => k.includes(qArabic) || qArabic.includes(k));
    }
    const enKeywords = [topic.en.toLowerCase(), ...topic.keywords.en, ...topic.keywords.translit];
    return enKeywords.some((k) => k.includes(qLower) || qLower.includes(k));
  });
}

// Literal keyword/root search across the whole Qur'an. Handles Arabic
// (diacritic-insensitive) and English (case-insensitive, multi-word AND,
// single-edit-distance typo tolerance) queries.
export function searchLiteral(query, index) {
  const q = query.trim();
  if (!q) return [];

  if (isArabicText(q)) {
    const qNorm = normalizeArabic(q);
    return index.filter((v) => v.arabicNorm.includes(qNorm));
  }

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const exact = index.filter((v) => words.every((w) => v.translationLower.includes(w)));
  if (exact.length > 0) return exact;

  // No exact hits — retry with each word corrected to its closest known
  // corpus word (edit distance <= 1) to tolerate simple typos.
  const uniqueWords = getUniqueWords(index);
  const correctedWords = words.map((w) => correctWord(w, uniqueWords));
  if (correctedWords.join(" ") === words.join(" ")) return [];
  return index.filter((v) => correctedWords.every((w) => v.translationLower.includes(w)));
}

// Runs both search levels and groups results: one section per matched
// topic, plus a "Keyword Matches" section for literal hits not already
// covered by a matched topic — never a flat list.
export async function runSearch(query) {
  const index = await loadSearchIndex();
  const matchedTopics = searchTopics(query);

  const shown = new Set();
  const topicGroups = matchedTopics.map((topic) => {
    const verses = index.filter((v) => v.topics.includes(topic.id));
    for (const v of verses) shown.add(`${v.surah}:${v.ayah}`);
    return { topic, verses };
  });

  const literal = searchLiteral(query, index)
    .filter((v) => !shown.has(`${v.surah}:${v.ayah}`))
    .slice(0, 50);

  return {
    topicGroups,
    literalMatches: literal,
    isEmpty: topicGroups.every((g) => g.verses.length === 0) && literal.length === 0,
  };
}
