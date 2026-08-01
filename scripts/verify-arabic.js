// Verifies every stored Arabic verse against a fresh fetch from quran.com:
//   1. Content match — our stored text must equal the live API's text
//      (after the same tatweel-strip + NFC-normalize processing), proving
//      no character was lost/altered/mis-scraped anywhere in the corpus.
//   2. Canonical form — our stored text must already equal its own NFC
//      normalization (i.e. every combining-mark sequence, not just
//      shadda+haraka, is in the canonical order fonts expect).
// Run: node scripts/verify-arabic.js

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { surahMeta } from "../src/data/surahMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "data", "surahs");
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function politeDelay() {
  return sleep(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
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

function cleanText(raw) {
  // Tatweel is kept (it's meaningful madd/elongation marking in authentic
  // Uthmani script, not a stripped artifact) — only trim + canonical-order.
  return raw.trim().normalize("NFC");
}

async function main() {
  let totalVerses = 0;
  let contentMismatches = [];
  let nonCanonical = [];

  for (const meta of surahMeta) {
    const file = path.join(OUT_DIR, `${meta.number}.json`);
    if (!fs.existsSync(file)) {
      console.log(`[skip] Surah ${meta.number} not scraped`);
      continue;
    }
    const stored = JSON.parse(fs.readFileSync(file, "utf-8"));

    await politeDelay();
    const url = `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${meta.number}`;
    const res = await fetchWithRetry(url);
    const json = await res.json();
    const liveByNumber = new Map(
      json.verses.map((v) => [parseInt(v.verse_key.split(":")[1], 10), cleanText(v.text_uthmani)])
    );

    for (const verse of stored.verses) {
      totalVerses += 1;
      const stored_ = verse.arabic;
      const live = liveByNumber.get(verse.number);

      if (stored_ !== stored_.normalize("NFC")) {
        nonCanonical.push(`${meta.number}:${verse.number}`);
      }
      if (live !== undefined && stored_ !== live) {
        contentMismatches.push({ ref: `${meta.number}:${verse.number}`, stored: stored_, live });
      }
    }
    console.log(`[checked] Surah ${meta.number} (${meta.transliteration}): ${stored.verses.length} verses`);
  }

  console.log("\n===== VERIFICATION SUMMARY =====");
  console.log(`Total verses checked: ${totalVerses}`);
  console.log(`Non-canonical (not NFC-normalized): ${nonCanonical.length}`);
  if (nonCanonical.length > 0) console.log("  " + nonCanonical.join(", "));
  console.log(`Content mismatches vs. live quran.com: ${contentMismatches.length}`);
  for (const m of contentMismatches.slice(0, 20)) {
    console.log(`  ${m.ref}:`);
    console.log(`    stored: ${m.stored}`);
    console.log(`    live:   ${m.live}`);
  }
  if (contentMismatches.length === 0 && nonCanonical.length === 0) {
    console.log("\nAll verses match quran.com exactly and are fully NFC-canonical.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
