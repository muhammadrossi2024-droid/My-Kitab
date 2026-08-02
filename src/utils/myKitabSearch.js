// Search scoped ONLY to the user's own My Kitab uploads (their extracted PDF
// page text from IndexedDB). Deliberately kept separate from utils/search.js
// — it never touches the Qur'an/Mutoon/Hadith index, so it can only ever
// return excerpts that actually exist in a user's own uploaded PDFs.
import { normalizeArabic, isArabicText } from "./arabicNormalize.js";
import { getAllPdfsFull } from "./myKitabDb.js";

const EXCERPT_RADIUS = 100;
const MAX_RESULTS = 50;

// Built from the same normalized/lowercased haystack the match was found in,
// so excerpt offsets always line up with the text that was actually matched.
function buildExcerpt(haystack, matchIndex, matchLen) {
  const start = Math.max(0, matchIndex - EXCERPT_RADIUS);
  const end = Math.min(haystack.length, matchIndex + matchLen + EXCERPT_RADIUS);
  let excerpt = haystack.slice(start, end).trim();
  if (start > 0) excerpt = "…" + excerpt;
  if (end < haystack.length) excerpt = excerpt + "…";
  return excerpt;
}

export async function searchMyKitab(query) {
  const q = query.trim();
  if (!q) return [];

  const arabic = isArabicText(q);
  const qNorm = arabic ? normalizeArabic(q) : q.toLowerCase();
  if (!qNorm) return [];

  const pdfs = await getAllPdfsFull();
  const results = [];

  for (const pdf of pdfs) {
    for (const page of pdf.pages || []) {
      if (!page.text) continue;
      const haystack = arabic ? normalizeArabic(page.text) : page.text.toLowerCase();
      const idx = haystack.indexOf(qNorm);
      if (idx === -1) continue;
      results.push({
        pdfId: pdf.id,
        pdfTitle: pdf.title,
        pageNumber: page.pageNumber,
        excerpt: buildExcerpt(haystack, idx, qNorm.length),
      });
      if (results.length >= MAX_RESULTS) return results;
    }
  }

  return results;
}
