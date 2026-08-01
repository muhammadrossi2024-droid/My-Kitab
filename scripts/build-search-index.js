// Builds public/data/search-index.json: a flat array of every scraped verse
// (arabic, translation, reference, normalized search fields, and topic
// tags) so the Search page can load one file instead of fetching all 114
// per-surah files. Run after (re-)scraping: node scripts/build-search-index.js

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { surahMeta } from "../src/data/surahMeta.js";
import { topicTags } from "../src/data/topicTags.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SURAHS_DIR = path.join(__dirname, "..", "public", "data", "surahs");
const OUT_FILE = path.join(__dirname, "..", "public", "data", "search-index.json");

// Invert topicTags ({topicId: [[surah,ayah], ...]}) into a lookup keyed by
// "surah:ayah" -> [topicId, ...] for O(1) tagging while building the index.
function buildTopicLookup() {
  const lookup = new Map();
  for (const [topicId, refs] of Object.entries(topicTags)) {
    for (const [surah, ayah] of refs) {
      const key = `${surah}:${ayah}`;
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key).push(topicId);
    }
  }
  return lookup;
}

function main() {
  const topicLookup = buildTopicLookup();
  const index = [];
  let missing = 0;

  for (const meta of surahMeta) {
    const file = path.join(SURAHS_DIR, `${meta.number}.json`);
    if (!fs.existsSync(file)) {
      missing += 1;
      continue;
    }
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    for (const verse of data.verses) {
      const key = `${meta.number}:${verse.number}`;
      index.push({
        surah: meta.number,
        ayah: verse.number,
        surahName: meta.transliteration,
        arabic: verse.arabic,
        translation: verse.translation,
        topics: topicLookup.get(key) || [],
      });
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(index));
  console.log(`Wrote ${index.length} verses to ${OUT_FILE}${missing ? ` (${missing} surah(s) not yet scraped, skipped)` : ""}`);
}

main();
