// Fetches a list of ayah refs from quran.com, groups consecutive ones quoted
// together in the matn into single combined entries, and prints ready-to-paste
// quranVerses JSON. Usage: node scripts/fetch-verses.mjs "103:1-3" "47:19" "73:15-16" ...

import { surahMeta } from "../src/data/surahMeta.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAyah(surah, ayah) {
  const key = `${surah}:${ayah}`;
  const [arRes, enRes] = await Promise.all([
    fetch(`https://api.quran.com/api/v4/verses/by_key/${key}?fields=text_uthmani`),
    fetch(`https://api.quran.com/api/v4/quran/translations/20?verse_key=${key}`),
  ]);
  const ar = await arRes.json();
  const en = await enRes.json();
  return {
    arabic: ar.verse.text_uthmani.trim(),
    translation: en.translations[0].text.replace(/<[^>]+>/g, "").trim(),
  };
}

async function main() {
  const refs = process.argv.slice(2);
  const out = [];
  for (const ref of refs) {
    const [surahStr, ayahRange] = ref.split(":");
    const surah = parseInt(surahStr, 10);
    const [startAyah, endAyah] = ayahRange.includes("-")
      ? ayahRange.split("-").map((n) => parseInt(n, 10))
      : [parseInt(ayahRange, 10), parseInt(ayahRange, 10)];

    const arabicParts = [];
    const translationParts = [];
    for (let a = startAyah; a <= endAyah; a++) {
      await sleep(300);
      const { arabic, translation } = await fetchAyah(surah, a);
      arabicParts.push(arabic);
      translationParts.push(translation);
      process.stderr.write(`fetched ${surah}:${a}\n`);
    }
    const meta = surahMeta[surah - 1];
    out.push({
      ref,
      surah,
      ayah: startAyah,
      surahNameArabic: meta.arabic,
      surahNameTransliteration: meta.transliteration,
      arabic: arabicParts.join(" "),
      translation: translationParts.join(" "),
    });
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
