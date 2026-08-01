// Replaces the "translation" field on every quranVerses[] entry across all
// Mutoon book JSON files with English text scraped from noblequran.com
// (matching the same source already used for the main Surah reader), keyed
// by surah:ayah. Arabic text and every other field are left untouched.
//
// Usage: node scripts/fetch-mutoon-noblequran-translations.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { noblequranSlugs } from "../src/data/noblequranSlugs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUTOON_DIR = path.join(__dirname, "..", "src", "data", "mutoon");
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 2000;

const SLUG_URL_OVERRIDES = {
  23: "23-surah-al-muminun",
  72: "72-surah-al-jinn",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function politeDelay() {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return sleep(ms);
}

async function fetchWithRetry(url, { retries = 2, delayMs = 3000 } = {}) {
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

async function fetchSurahTranslations(surahNumber) {
  const slugPath = SLUG_URL_OVERRIDES[surahNumber] || `surah-${noblequranSlugs[surahNumber - 1]}`;
  const url = `https://noblequran.com/${slugPath}/`;
  await politeDelay();
  const res = await fetchWithRetry(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const verses = new Map();
  $("p").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const m = text.match(/^(\d+)\.\s*(.+)$/);
    if (!m) return;
    verses.set(parseInt(m[1], 10), m[2].trim());
  });
  return verses;
}

function parseRef(ref) {
  const [surahStr, ayahRange] = ref.split(":");
  const surah = parseInt(surahStr, 10);
  const [start, end] = ayahRange.includes("-")
    ? ayahRange.split("-").map((n) => parseInt(n, 10))
    : [parseInt(ayahRange, 10), parseInt(ayahRange, 10)];
  return { surah, start, end };
}

async function main() {
  const files = fs
    .readdirSync(MUTOON_DIR)
    .filter((f) => f.endsWith(".json"));

  const books = files.map((f) => {
    const p = path.join(MUTOON_DIR, f);
    return { file: f, path: p, data: JSON.parse(fs.readFileSync(p, "utf-8").replace(/^﻿/, "")) };
  });

  // Collect every surah number referenced across all books so each surah
  // page is fetched from noblequran.com exactly once.
  const surahNumbers = new Set();
  for (const book of books) {
    for (const v of book.data.quranVerses || []) {
      surahNumbers.add(parseRef(v.ref).surah);
    }
  }

  const translationsBySurah = new Map();
  for (const surah of [...surahNumbers].sort((a, b) => a - b)) {
    console.log(`[fetch] Surah ${surah} from noblequran.com...`);
    try {
      const verses = await fetchSurahTranslations(surah);
      translationsBySurah.set(surah, verses);
      console.log(`  [ok] ${verses.size} verse(s) parsed`);
    } catch (err) {
      console.error(`  [error] Surah ${surah}: ${err.message}`);
    }
  }

  for (const book of books) {
    let changed = 0;
    let missing = 0;
    for (const v of book.data.quranVerses || []) {
      const { surah, start, end } = parseRef(v.ref);
      const surahVerses = translationsBySurah.get(surah);
      if (!surahVerses) {
        console.warn(`  [warn] ${book.file}: no data fetched for surah ${surah} (ref ${v.ref})`);
        missing++;
        continue;
      }
      const parts = [];
      let ok = true;
      for (let a = start; a <= end; a++) {
        const t = surahVerses.get(a);
        if (!t) {
          console.warn(`  [warn] ${book.file}: missing noblequran.com translation for ${surah}:${a} (ref ${v.ref})`);
          ok = false;
          continue;
        }
        parts.push(t);
      }
      if (!ok || parts.length === 0) {
        missing++;
        continue;
      }
      v.translation = parts.join(" ");
      changed++;
    }
    fs.writeFileSync(book.path, JSON.stringify(book.data, null, 2));
    console.log(`[saved] ${book.file}: ${changed} verse(s) updated, ${missing} unresolved`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
