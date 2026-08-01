// Builds one JSON file per surah under public/data/surahs/, combining:
//   - English translation (Hilali-Khan) from static pages on noblequran.com
//   - Arabic Uthmani text from the quran.com API (api.quran.com), which
//     serves the community-verified Tanzil Uthmani text corpus
// Both sources return plain HTML/JSON in a single request per surah — no
// browser automation needed. (Earlier versions of this script drove a
// headless browser against thenoblequran.com's JS-rendered SPA, which
// turned out to rate-limit automated traffic, and later used the AlQuran
// Cloud API for Arabic, which required a fragile Bismillah-stripping
// workaround; quran.com's chapter endpoint returns Bismillah as separate
// from verse 1 already, so that workaround is gone entirely.)
//
// Usage:
//   node scripts/scrape-quran.js                    scrape all 114 surahs (skips ones already saved)
//   node scripts/scrape-quran.js --only=18           scrape just surah 18
//   node scripts/scrape-quran.js --start=1 --end=10  scrape a range
//   node scripts/scrape-quran.js --force             re-scrape even if the JSON already exists (refetches English too)
//   node scripts/scrape-quran.js --refresh-arabic    re-fetch ONLY the Arabic for already-scraped surahs,
//                                                     keeping the existing English translation untouched
//
// Respectful-scraping notes:
//   - sequential requests only, one at a time
//   - a randomized 1-2s delay is awaited before every single HTTP request

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { surahMeta } from "../src/data/surahMeta.js";
import { noblequranSlugs } from "../src/data/noblequranSlugs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "data", "surahs");
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 2000;
const TRANSLATOR = "Muhammad Muhsin Khan & Muhammad Taqi-ud-Din al-Hilali";

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );
  return {
    only: args.only ? parseInt(args.only, 10) : null,
    start: args.start ? parseInt(args.start, 10) : 1,
    end: args.end ? parseInt(args.end, 10) : 114,
    force: Boolean(args.force),
    refreshArabic: Boolean(args["refresh-arabic"]),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function politeDelay() {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return sleep(ms);
}

function surahPath(number) {
  return path.join(OUT_DIR, `${number}.json`);
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

// A couple of surah pages on the site use an inconsistent URL scheme (a
// leading surah number instead of the usual "surah-" prefix).
const SLUG_URL_OVERRIDES = {
  23: "23-surah-al-muminun",
  72: "72-surah-al-jinn",
};

// English translation: one static HTML page per surah, verses rendered as
// plain <p>N. text</p> paragraphs inside the page's text-editor widget.
// Matching "<p>N. ..." globally (rather than pinning down a specific
// container) is what the site actually uses consistently — verified against
// every surah having zero missing/duplicate verse numbers.
async function fetchEnglish(surahNumber) {
  const path = SLUG_URL_OVERRIDES[surahNumber] || `surah-${noblequranSlugs[surahNumber - 1]}`;
  const url = `https://noblequran.com/${path}/`;
  await politeDelay();
  const res = await fetchWithRetry(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const verses = new Map();
  $("p").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const m = text.match(/^(\d+)\.\s*(.+)$/);
    if (!m) return;
    const number = parseInt(m[1], 10);
    verses.set(number, m[2].trim());
  });
  return verses;
}

// Arabic Uthmani text: one JSON request per surah via the quran.com API
// (https://api.quran.com/api/v4), which serves the community-verified
// Tanzil Uthmani text corpus. Unlike AlQuran Cloud, this endpoint returns
// the Bismillah as its own concern rather than glued onto verse 1's text,
// so no post-processing/stripping is needed here.
async function fetchArabic(surahNumber) {
  const url = `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`;
  await politeDelay();
  const res = await fetchWithRetry(url);
  const json = await res.json();
  const verses = new Map();
  for (const v of json.verses) {
    const ayahNumber = parseInt(v.verse_key.split(":")[1], 10);
    // Keep tatweel characters as-is: in authentic Uthmani orthography a
    // tatweel followed by a small/dagger alef (e.g. "تَـٰ") marks a natural
    // madd (elongation) in recitation — it's not a decorative artifact, and
    // stripping it made our text diverge from quran.com's actual script.
    let text = v.text_uthmani.trim();
    // The API stores shadda BEFORE the accompanying vowel mark (e.g.
    // shadda-then-fatha), which is valid Unicode but not canonical order
    // (vowel marks have combining class 30, shadda has 33, so canonical
    // order is vowel-then-shadda). Most fonts' mark-stacking rules expect
    // canonical order and misplace/duplicate the marks otherwise — NFC
    // normalization reorders combining marks by combining class and fixes
    // this without changing which marks are present.
    text = text.normalize("NFC");
    verses.set(ayahNumber, text);
  }
  return verses;
}

async function scrapeSurah(meta) {
  const { number } = meta;
  const [englishByNumber, arabicByNumber] = await Promise.all([
    fetchEnglish(number),
    fetchArabic(number),
  ]);

  const allNumbers = new Set([...englishByNumber.keys(), ...arabicByNumber.keys()]);
  const verses = Array.from(allNumbers)
    .sort((a, b) => a - b)
    .map((num) => ({
      number: num,
      arabic: arabicByNumber.get(num) || "",
      translation: englishByNumber.get(num) || "",
      translator: TRANSLATOR,
    }));

  const incomplete = verses.filter((v) => !v.arabic || !v.translation);
  if (incomplete.length > 0) {
    console.warn(
      `  [warn] Surah ${number}: ${incomplete.length} verse(s) missing arabic or translation: ` +
        incomplete.map((v) => v.number).join(", ")
    );
  }

  return {
    number,
    name: {
      arabic: meta.arabic,
      transliteration: meta.transliteration,
      englishMeaning: meta.englishMeaning,
    },
    revelationType: meta.revelationType,
    totalVerses: verses.length,
    sources: {
      translation: "https://noblequran.com/",
      arabic: "https://api.quran.com/api/v4",
    },
    scrapedAt: new Date().toISOString(),
    verses,
  };
}

// Re-fetches only the Arabic for an already-scraped surah, merging it by
// ayah number into the existing English translation on disk rather than
// re-hitting noblequran.com for text that hasn't changed.
async function refreshArabicForSurah(meta, existingData) {
  const arabicByNumber = await fetchArabic(meta.number);
  const existingByNumber = new Map(existingData.verses.map((v) => [v.number, v]));
  const allNumbers = new Set([...existingByNumber.keys(), ...arabicByNumber.keys()]);

  const verses = Array.from(allNumbers)
    .sort((a, b) => a - b)
    .map((num) => {
      const existing = existingByNumber.get(num) || {};
      return {
        number: num,
        arabic: arabicByNumber.get(num) || existing.arabic || "",
        translation: existing.translation || "",
        translator: existing.translator || TRANSLATOR,
      };
    });

  return {
    ...existingData,
    totalVerses: verses.length,
    sources: {
      ...existingData.sources,
      arabic: "https://api.quran.com/api/v4",
    },
    scrapedAt: new Date().toISOString(),
    verses,
  };
}

function buildIndex() {
  const index = surahMeta.map((meta) => {
    const file = surahPath(meta.number);
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
          number: meta.number,
          transliteration: meta.transliteration,
          arabic: meta.arabic,
          englishMeaning: meta.englishMeaning,
          revelationType: meta.revelationType,
          verseCount: data.totalVerses,
          scraped: true,
        };
      } catch {
        // fall through to unscraped entry below
      }
    }
    return {
      number: meta.number,
      transliteration: meta.transliteration,
      arabic: meta.arabic,
      englishMeaning: meta.englishMeaning,
      revelationType: meta.revelationType,
      verseCount: meta.verseCount,
      scraped: false,
    };
  });
  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));
}

async function main() {
  const { only, start, end, force, refreshArabic } = parseArgs();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const targets = surahMeta.filter((m) =>
    only ? m.number === only : m.number >= start && m.number <= end
  );

  let done = 0;
  for (const meta of targets) {
    const outFile = surahPath(meta.number);
    const exists = fs.existsSync(outFile);

    if (refreshArabic) {
      if (!exists) {
        console.log(`[skip] Surah ${meta.number} (${meta.transliteration}) not yet scraped, nothing to refresh`);
        continue;
      }
      try {
        console.log(`[refresh-arabic] Surah ${meta.number} (${meta.transliteration})...`);
        const existingData = JSON.parse(fs.readFileSync(outFile, "utf-8"));
        const data = await refreshArabicForSurah(meta, existingData);
        fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
        buildIndex();
        done += 1;
        console.log(`[saved] Surah ${meta.number}: ${data.totalVerses} verses -> ${outFile}`);
      } catch (err) {
        console.error(`[error] Surah ${meta.number} (${meta.transliteration}): ${err.message}`);
      }
      continue;
    }

    if (!force && exists) {
      console.log(`[skip] Surah ${meta.number} (${meta.transliteration}) already scraped`);
      continue;
    }
    try {
      console.log(`[scrape] Surah ${meta.number} (${meta.transliteration})...`);
      const data = await scrapeSurah(meta);
      fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
      buildIndex();
      done += 1;
      console.log(`[saved] Surah ${meta.number}: ${data.totalVerses} verses -> ${outFile}`);
    } catch (err) {
      console.error(`[error] Surah ${meta.number} (${meta.transliteration}): ${err.message}`);
    }
  }

  buildIndex();
  console.log(`Done. ${refreshArabic ? "Refreshed" : "Newly scraped"} ${done} surah(s). Index written to ${path.join(OUT_DIR, "index.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
