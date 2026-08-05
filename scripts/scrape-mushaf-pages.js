// Builds the data behind Quran Page View (the Premium "Mushaf" reading mode):
// the standard 604-page, 15-line Hafs Madani Mushaf layout.
//
// Source: the quran.com API (api.quran.com), same provider already used for
// Arabic text in scrape-quran.js. Fetched by juz (30 requests covering the
// whole Quran) rather than by page (604 requests) — juz already carries
// page_number/line_number per word, so one pass groups everything into
// per-page files locally with no extra requests.
//
// mushaf=5 is "KFGQPC HAFS" — the standard 15-line/604-page Madani layout
// rendered with a single ordinary Uthmani font (unlike mushaf id 1/2, whose
// pixel-perfect look depends on 604 individual per-page glyph fonts). Reusing
// this project's existing Scheherazade New/Amiri Quran fonts keeps the text
// selectable/accessible while still matching the real Mushaf's line breaks,
// page boundaries, and Surah/Juz layout exactly, since those come straight
// from quran.com's authoritative line/page data.
//
// Usage:
//   node scripts/scrape-mushaf-pages.js

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { surahMeta } from "../src/data/surahMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = path.join(__dirname, "..", "public", "data", "mushaf", "pages");
const MUSHAF_DIR = path.join(__dirname, "..", "public", "data", "mushaf");
const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 900;
const TOTAL_JUZ = 30;
const TOTAL_PAGES = 604;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function politeDelay() {
  return sleep(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

async function fetchWithRetry(url, { retries = 3, delayMs = 3000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(delayMs);
    }
  }
  throw lastErr;
}

async function fetchJuz(juzNumber) {
  const url =
    `https://api.quran.com/api/v4/verses/by_juz/${juzNumber}` +
    `?words=true&mushaf=5&word_fields=text_uthmani,line_number,page_number,char_type_name` +
    `&fields=page_number,juz_number&per_page=1000`;
  await politeDelay();
  const res = await fetchWithRetry(url);
  const json = await res.json();
  if (json.pagination?.total_pages > 1) {
    throw new Error(
      `Juz ${juzNumber} has ${json.pagination.total_records} verses across ${json.pagination.total_pages} pages — per_page=1000 wasn't enough`
    );
  }
  return json.verses;
}

async function main() {
  fs.mkdirSync(PAGES_DIR, { recursive: true });

  // Flat, ordered list of every word in the Quran, juz 1 through 30 —
  // juz order already matches Quran order, so no re-sorting is needed.
  const words = [];
  const ayahPageMap = {};
  const seenVerseKeys = new Set();
  let runningJuz = null;

  for (let juzNumber = 1; juzNumber <= TOTAL_JUZ; juzNumber++) {
    process.stdout.write(`Fetching juz ${juzNumber}/${TOTAL_JUZ}... `);
    const verses = await fetchJuz(juzNumber);
    console.log(`${verses.length} verses`);

    for (const verse of verses) {
      const [surahStr, ayahStr] = verse.verse_key.split(":");
      const surahNumber = parseInt(surahStr, 10);
      const ayahNumber = parseInt(ayahStr, 10);

      if (seenVerseKeys.has(verse.verse_key)) continue; // juz boundaries can overlap by one shared verse in rare API responses
      seenVerseKeys.add(verse.verse_key);

      const isNewJuz = verse.juz_number !== runningJuz;
      runningJuz = verse.juz_number;

      const realWords = verse.words;
      realWords.forEach((w, i) => {
        words.push({
          page: w.page_number,
          line: w.line_number,
          text: w.text_uthmani.trim().normalize("NFC"),
          verseKey: verse.verse_key,
          surah: surahNumber,
          ayah: ayahNumber,
          end: w.char_type_name === "end",
          juzStart: i === 0 && isNewJuz ? verse.juz_number : null,
        });
      });

      if (!(verse.verse_key in ayahPageMap)) {
        ayahPageMap[verse.verse_key] = realWords[0]?.page_number ?? verse.page_number;
      }
    }
  }

  console.log(`Total words: ${words.length}, total verses: ${seenVerseKeys.size}`);

  // Group into pages, detecting Surah-header/Bismillah gaps purely from the
  // real line-number gaps in the data (see the comment above handleGap
  // below) rather than hardcoding which surahs get a Bismillah line.
  const pages = new Map(); // pageNumber -> { page, items }
  function getPage(n) {
    if (!pages.has(n)) pages.set(n, { page: n, items: [] });
    return pages.get(n);
  }

  let prevPage = null;
  let prevLine = 0;
  let prevVerseKey = null;

  for (const w of words) {
    const page = getPage(w.page);
    if (w.page !== prevPage) {
      prevLine = 0; // a new page always starts its own gap accounting
      prevPage = w.page;
    }

    const isFirstWordOfAyah = w.verseKey !== prevVerseKey;
    if (isFirstWordOfAyah && w.ayah === 1) {
      // Real Mushaf pages reserve exactly one blank line for a new Surah's
      // ornamental name banner, and — for every Surah except Al-Fatihah
      // (whose Bismillah IS verse 1 itself) — a second blank line for the
      // separate Bismillah line above verse 1. Deriving the reserved-line
      // count from the actual gap (rather than special-casing surah 1 and
      // 9) means it stays correct even for any edge case in the source data.
      const gap = w.line - prevLine - 1;
      if (gap >= 1) page.items.push({ type: "surah-header", surah: w.surah });
      if (gap >= 2) page.items.push({ type: "bismillah" });
    }

    let lastItem = page.items[page.items.length - 1];
    if (!lastItem || lastItem.type !== "line" || lastItem.line !== w.line) {
      lastItem = { type: "line", line: w.line, words: [] };
      page.items.push(lastItem);
    }
    const wordEntry = { t: w.text, v: w.verseKey };
    if (w.end) wordEntry.end = true;
    if (w.juzStart) wordEntry.juz = w.juzStart;
    lastItem.words.push(wordEntry);

    prevLine = w.line;
    prevVerseKey = w.verseKey;
  }

  const pageNumbers = Array.from(pages.keys()).sort((a, b) => a - b);
  console.log(`Pages produced: ${pageNumbers.length} (expected ${TOTAL_PAGES})`);
  const missing = [];
  for (let n = 1; n <= TOTAL_PAGES; n++) if (!pages.has(n)) missing.push(n);
  if (missing.length) console.warn(`Missing pages: ${missing.join(", ")}`);

  for (const n of pageNumbers) {
    fs.writeFileSync(path.join(PAGES_DIR, `${n}.json`), JSON.stringify(pages.get(n)));
  }

  fs.writeFileSync(path.join(MUSHAF_DIR, "ayah-page-map.json"), JSON.stringify(ayahPageMap));

  // Juz start pages, derived from the juzStart flags recorded on words above.
  const juzStartPages = {};
  for (const w of words) {
    if (w.juzStart && !(w.juzStart in juzStartPages)) juzStartPages[w.juzStart] = w.page;
  }
  const juzPageList = Array.from({ length: TOTAL_JUZ }, (_, i) => ({
    juz: i + 1,
    page: juzStartPages[i + 1],
  }));
  fs.writeFileSync(path.join(MUSHAF_DIR, "juz-page-map.json"), JSON.stringify(juzPageList));

  const surahPageList = surahMeta.map((s) => ({
    surah: s.number,
    page: ayahPageMap[`${s.number}:1`],
  }));
  fs.writeFileSync(path.join(MUSHAF_DIR, "surah-page-map.json"), JSON.stringify(surahPageList));

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
