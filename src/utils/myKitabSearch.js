// Search scoped ONLY to the user's own My Kitab uploads (their extracted PDF
// page text from IndexedDB). Deliberately kept separate from utils/search.js
// — it never touches the Qur'an/Mutoon/Hadith index, so it can only ever
// return excerpts that actually exist in a user's own uploaded PDFs.
//
// Three tiers, tried in order, first-match-wins per page:
//   1. exact phrase substring
//   2. typo-corrected phrase (reuses utils/search.js's Levenshtein fuzzy
//      matching against a word corpus built only from the user's own PDFs)
//   3. stemmed/stopword-filtered word-overlap over sentence-pair chunks —
//      a lightweight, fully local stand-in for "topic" search: it surfaces
//      passages that share meaningful words with the query even when the
//      exact phrase isn't present, without pulling in anything beyond the
//      uploaded PDFs' own text.
import { normalizeArabic, isArabicText } from "./arabicNormalize.js";
import { correctWord } from "./search.js";
import { getAllPdfsFull } from "./myKitabDb.js";

const EXCERPT_RADIUS = 100;
const MAX_RESULTS = 30;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with", "is", "are",
  "was", "were", "be", "been", "being", "this", "that", "these", "those", "it", "its", "as",
  "at", "by", "from", "into", "about", "if", "then", "than", "so", "not", "no", "do", "does",
  "did", "have", "has", "had", "can", "will", "would", "should", "could", "i", "you", "he",
  "she", "they", "we", "what", "which", "who", "whom", "there", "here", "how", "when", "where",
]);

// Cheap suffix-stripping stemmer — not a full Porter stemmer, just enough
// for "search"/"searching"/"searched" or "book"/"books" to line up when
// scoring word overlap for tier 3.
function stem(word) {
  let w = word;
  if (w.length > 6 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 5 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (w.length > 5 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  else if (w.length > 5 && w.endsWith("ly")) w = w.slice(0, -2);
  return w;
}

function significantWords(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || [])
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map(stem);
}

function buildExcerpt(haystack, matchIndex, matchLen) {
  const start = Math.max(0, matchIndex - EXCERPT_RADIUS);
  const end = Math.min(haystack.length, matchIndex + matchLen + EXCERPT_RADIUS);
  let excerpt = haystack.slice(start, end).trim();
  if (start > 0) excerpt = "…" + excerpt;
  if (end < haystack.length) excerpt = excerpt + "…";
  return excerpt;
}

// Splits page text into small overlapping-ish sentence-pair chunks for
// topic-overlap scoring.
function chunkText(text) {
  const sentences = text.split(/(?<=[.!?؟۔])\s+/).filter(Boolean);
  if (sentences.length <= 1) return [text];
  const chunks = [];
  const WINDOW = 2;
  for (let i = 0; i < sentences.length; i += WINDOW) {
    chunks.push(sentences.slice(i, i + WINDOW).join(" "));
  }
  return chunks;
}

function buildCorpusWordList(pdfs) {
  const words = new Set();
  for (const pdf of pdfs) {
    for (const page of pdf.pages || []) {
      for (const w of (page.text || "").toLowerCase().match(/[a-z']+/g) || []) {
        if (w.length >= 4) words.add(w);
      }
    }
  }
  return Array.from(words);
}

function searchArabic(q, pdfs) {
  const qNorm = normalizeArabic(q);
  const results = [];
  for (const pdf of pdfs) {
    for (const page of pdf.pages || []) {
      if (!page.text) continue;
      const hay = normalizeArabic(page.text);
      const idx = hay.indexOf(qNorm);
      if (idx === -1) continue;
      results.push({
        pdfId: pdf.id,
        pdfTitle: pdf.title,
        pageNumber: page.pageNumber,
        excerpt: buildExcerpt(hay, idx, qNorm.length),
        matchText: qNorm,
      });
    }
  }
  return results.slice(0, MAX_RESULTS);
}

export async function searchMyKitab(query) {
  const q = query.trim();
  if (!q) return [];

  const pdfs = await getAllPdfsFull();
  if (isArabicText(q)) return searchArabic(q, pdfs);

  const qNorm = q.toLowerCase();
  const seenPages = new Set();
  const results = [];

  // Tier 1: exact phrase substring.
  for (const pdf of pdfs) {
    for (const page of pdf.pages || []) {
      if (!page.text) continue;
      const hay = page.text.toLowerCase();
      const idx = hay.indexOf(qNorm);
      if (idx === -1) continue;
      const key = `${pdf.id}:${page.pageNumber}`;
      seenPages.add(key);
      results.push({
        pdfId: pdf.id,
        pdfTitle: pdf.title,
        pageNumber: page.pageNumber,
        excerpt: buildExcerpt(hay, idx, qNorm.length),
        matchText: q,
        tier: 0,
      });
    }
  }

  // Tier 2: typo-corrected phrase — each query word snapped to the closest
  // word that actually appears in the user's own PDFs, then AND-matched.
  const corpus = buildCorpusWordList(pdfs);
  const queryWords = qNorm.split(/\s+/).filter(Boolean);
  const corrected = queryWords.map((w) => correctWord(w, corpus, 4));
  if (corrected.join(" ") !== qNorm) {
    for (const pdf of pdfs) {
      for (const page of pdf.pages || []) {
        const key = `${pdf.id}:${page.pageNumber}`;
        if (seenPages.has(key) || !page.text) continue;
        const hay = page.text.toLowerCase();
        if (!corrected.every((w) => hay.includes(w))) continue;
        seenPages.add(key);
        const idx = hay.indexOf(corrected[0]);
        results.push({
          pdfId: pdf.id,
          pdfTitle: pdf.title,
          pageNumber: page.pageNumber,
          excerpt: buildExcerpt(hay, idx === -1 ? 0 : idx, corrected[0].length),
          matchText: corrected.join(" "),
          tier: 1,
        });
      }
    }
  }

  // Tier 3: stemmed word-overlap over chunks — surfaces a relevant passage
  // even when the exact words aren't present, still only from these PDFs.
  const qSig = significantWords(q);
  if (qSig.length > 0) {
    for (const pdf of pdfs) {
      for (const page of pdf.pages || []) {
        const key = `${pdf.id}:${page.pageNumber}`;
        if (seenPages.has(key) || !page.text) continue;
        let bestChunk = null;
        let bestScore = 0;
        for (const chunk of chunkText(page.text)) {
          const chunkWords = new Set(significantWords(chunk));
          let score = 0;
          for (const w of qSig) {
            if (chunkWords.has(w)) score += 1;
          }
          if (score > bestScore) {
            bestScore = score;
            bestChunk = chunk;
          }
        }
        // Require a meaningful fraction of the query's significant words to
        // show up, so a single common word doesn't drag in every page.
        const threshold = qSig.length === 1 ? 1 : Math.ceil(qSig.length * 0.5);
        if (bestChunk && bestScore >= threshold) {
          seenPages.add(key);
          results.push({
            pdfId: pdf.id,
            pdfTitle: pdf.title,
            pageNumber: page.pageNumber,
            excerpt: bestChunk.trim(),
            matchText: bestChunk.trim(),
            tier: 2,
            score: bestScore,
          });
        }
      }
    }
  }

  results.sort((a, b) => a.tier - b.tier || (b.score || 0) - (a.score || 0));
  return results.slice(0, MAX_RESULTS);
}
