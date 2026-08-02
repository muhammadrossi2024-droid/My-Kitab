// Builds public/data/content-index.json: a flat array of searchable Mutoon
// paragraphs and standalone Hadith entries (Qur'an verses are covered
// separately by search-index.json). Run after any Mutoon/hadith data edit:
// node scripts/build-content-index.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUTOON_DIR = path.join(__dirname, "..", "src", "data", "mutoon");
const OUT_FILE = path.join(__dirname, "..", "public", "data", "content-index.json");

const BOOK_TITLES = {
  "usul-al-thalathah": "Al-Usul al-Thalathah",
  "qawaid-al-arba": "Al-Qawa'id al-Arba'",
  "nawaqid-al-islam": "Nawaqid al-Islam",
  "arbaun-nawawiyyah": "Al-Arba'un al-Nawawiyyah",
};

// Hadith-only books: every paragraph in the book IS a hadith text, so index
// entries are labeled "Hadith" rather than "Mutoon".
const HADITH_BOOKS = new Set(["arbaun-nawawiyyah"]);

const COLLECTIONS = [
  { re: /agreed upon/i, name: "Al-Bukhari & Muslim" },
  { re: /bukh[aā]r[iī]/i, name: "Al-Bukhari" },
  { re: /muslim/i, name: "Muslim" },
  { re: /tirmidh[iī]/i, name: "At-Tirmidhi" },
  { re: /abu\s*d[aā]w[uū]d/i, name: "Abu Dawud" },
  { re: /ibn\s*m[aā]jah/i, name: "Ibn Majah" },
  { re: /nasa['’]?[iī]/i, name: "An-Nasa'i" },
  { re: /ahmad/i, name: "Ahmad" },
  { re: /h[aā]kim/i, name: "Al-Hakim" },
  { re: /hibb[aā]n/i, name: "Ibn Hibban" },
];

function extractCollection(source) {
  if (!source) return null;
  for (const c of COLLECTIONS) {
    if (c.re.test(source)) return c.name;
  }
  return null;
}

function paragraphText(para) {
  if (typeof para === "string") return para;
  if (para && para.type === "list") {
    const parts = [];
    if (para.lead) parts.push(para.lead);
    for (const item of para.items || []) parts.push(item.arabic);
    if (para.trailing) parts.push(para.trailing);
    return parts.join(" ");
  }
  if (para && para.arabic) return para.arabic;
  return "";
}

// Mirrors MutoonReader.jsx's buildPages() so link page-keys stay in sync
// with the reader's own anchors.
function buildPages(book) {
  const pages = [];
  const introUnits = [];
  if (book.bismillah) introUnits.push({ kind: "bismillah", text: book.bismillah });
  if (book.intro) introUnits.push({ kind: "intro", text: book.intro });
  if (book.introParagraphs) {
    for (const para of book.introParagraphs) {
      introUnits.push({ kind: "para", text: paragraphText(para) });
    }
  }
  introUnits.forEach((unit, i) => {
    pages.push({ key: `intro-${i}`, heading: null, text: unit.text });
  });

  for (const section of book.sections) {
    const paragraphs = section.paragraphs || [section.arabic];
    paragraphs.forEach((para, i) => {
      pages.push({
        key: `section-${section.number}-${i}`,
        heading: section.heading || null,
        text: paragraphText(para),
      });
    });
  }

  if (book.closing) {
    pages.push({ key: "closing", heading: null, text: book.closing });
  }

  return pages;
}

function main() {
  const entries = [];
  const files = fs.readdirSync(MUTOON_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const bookId = file.replace(/\.json$/, "");
    const book = JSON.parse(fs.readFileSync(path.join(MUTOON_DIR, file), "utf-8"));
    const bookTitle = BOOK_TITLES[bookId] || book.title?.transliteration || bookId;
    const isHadithBook = HADITH_BOOKS.has(bookId);

    // Body paragraphs (the matn's own prose/sections).
    for (const page of buildPages(book)) {
      if (!page.text || !page.text.trim()) continue;
      entries.push({
        type: isHadithBook ? "hadith" : "mutoon",
        label: isHadithBook ? `Hadith — ${bookTitle}` : `Mutoon — ${bookTitle}`,
        heading: page.heading,
        arabic: page.text,
        translation: null,
        link: `/mutoon/${bookId}#${page.key}`,
      });
    }

    // Standalone `hadiths` arrays (Usul al-Thalathah, Qawa'id al-Arba').
    if (Array.isArray(book.hadiths)) {
      for (const h of book.hadiths) {
        const collection = extractCollection(h.source);
        entries.push({
          type: "hadith",
          label: collection ? `Hadith — ${collection}` : `Hadith — ${bookTitle}`,
          heading: null,
          arabic: h.arabic || null,
          translation: h.translation || null,
          link: `/mutoon/${bookId}?tab=hadith`,
        });
      }
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(entries));
  console.log(`Wrote ${entries.length} Mutoon/Hadith entries to ${OUT_FILE}`);
}

main();
