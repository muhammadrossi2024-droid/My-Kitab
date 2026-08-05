// Data access for Quran Page View (the Premium Mushaf reader) — see
// scripts/scrape-mushaf-pages.js for how public/data/mushaf/ is built.
//
// Two caching layers, same pattern as utils/offline.js:
//   - an in-memory Map so flipping back to a page already seen this session
//     is instant with no network/Cache Storage round trip at all
//   - the browser's Cache Storage API (where available) so Page View still
//     works fully offline once pages have been visited, same as downloaded
//     surahs in Scroll View
// Adjacent pages are prefetched (network + populated into both caches)
// whenever a page is opened, so tapping next/previous almost always hits
// the in-memory cache instead of waiting on a request.

export const TOTAL_MUSHAF_PAGES = 604;
const CACHE_NAME = "mushaf-pages-v2"; // bumped: v1 cached pre-QCF-glyph page JSON (no `g` field)

const pageCache = new Map(); // pageNumber -> parsed page JSON
const pagePromises = new Map(); // pageNumber -> in-flight fetch promise (de-dupes concurrent calls)
const fontPromises = new Map(); // pageNumber -> in-flight/loaded FontFace promise (de-dupes and remembers)

let ayahPageMapPromise = null;
let juzPageMapPromise = null;
let surahPageMapPromise = null;

function hasCacheSupport() {
  return typeof caches !== "undefined";
}

async function fetchJson(url) {
  if (hasCacheSupport()) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) return cached.json();
      const res = await fetch(url);
      if (res.ok) await cache.put(url, res.clone());
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res.json();
    } catch {
      // fall through to a plain network fetch (e.g. Cache Storage denied)
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchArrayBuffer(url) {
  if (hasCacheSupport()) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) return cached.arrayBuffer();
      const res = await fetch(url);
      if (res.ok) await cache.put(url, res.clone());
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res.arrayBuffer();
    } catch {
      // fall through to a plain network fetch (e.g. Cache Storage denied)
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.arrayBuffer();
}

// One authentic King Fahd Quran Complex (QCF v2) font per Mushaf page — see
// scripts/scrape-mushaf-pages.js for how each page's `g` glyph codes line up
// with its font file.
export function pageFontFamily(pageNumber) {
  return `qcf-p${pageNumber}`;
}

function pageFontUrl(pageNumber) {
  return `https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p${pageNumber}.woff2`;
}

// Loads (and caches, in both the in-memory Map and Cache Storage) the glyph
// font for one Mushaf page, resolving once it's actually usable via
// document.fonts. Callers should keep showing the plain-text (`t`) fallback
// until this resolves — it rejects silently on failure so a slow/broken font
// load never blocks the page from being readable.
export function loadPageFont(pageNumber) {
  if (pageNumber < 1 || pageNumber > TOTAL_MUSHAF_PAGES) {
    return Promise.reject(new Error(`Page ${pageNumber} is out of range`));
  }
  if (fontPromises.has(pageNumber)) return fontPromises.get(pageNumber);

  const promise = fetchArrayBuffer(pageFontUrl(pageNumber))
    .then(async (buffer) => {
      const fontFace = new FontFace(pageFontFamily(pageNumber), buffer);
      await fontFace.load();
      document.fonts.add(fontFace);
      return fontFace;
    })
    .catch((err) => {
      fontPromises.delete(pageNumber);
      throw err;
    });
  fontPromises.set(pageNumber, promise);
  return promise;
}

export function fetchMushafPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > TOTAL_MUSHAF_PAGES) {
    return Promise.reject(new Error(`Page ${pageNumber} is out of range`));
  }
  if (pageCache.has(pageNumber)) return Promise.resolve(pageCache.get(pageNumber));
  if (pagePromises.has(pageNumber)) return pagePromises.get(pageNumber);

  const promise = fetchJson(`/data/mushaf/pages/${pageNumber}.json`)
    .then((data) => {
      pageCache.set(pageNumber, data);
      pagePromises.delete(pageNumber);
      return data;
    })
    .catch((err) => {
      pagePromises.delete(pageNumber);
      throw err;
    });
  pagePromises.set(pageNumber, promise);
  return promise;
}

// Fire-and-forget warm-up for smooth next/previous navigation — failures
// (e.g. page 0 or 605 at the edges of the Mushaf) are silently ignored.
export function prefetchAdjacentPages(pageNumber) {
  fetchMushafPage(pageNumber - 1).catch(() => {});
  fetchMushafPage(pageNumber + 1).catch(() => {});
  loadPageFont(pageNumber - 1).catch(() => {});
  loadPageFont(pageNumber + 1).catch(() => {});
}

export function getAyahPageMap() {
  if (!ayahPageMapPromise) ayahPageMapPromise = fetchJson("/data/mushaf/ayah-page-map.json");
  return ayahPageMapPromise;
}

export function getJuzPageMap() {
  if (!juzPageMapPromise) juzPageMapPromise = fetchJson("/data/mushaf/juz-page-map.json");
  return juzPageMapPromise;
}

export function getSurahPageMap() {
  if (!surahPageMapPromise) surahPageMapPromise = fetchJson("/data/mushaf/surah-page-map.json");
  return surahPageMapPromise;
}

export async function pageForAyah(surahNumber, ayahNumber) {
  const map = await getAyahPageMap();
  return map[`${surahNumber}:${ayahNumber}`] ?? null;
}

export async function pageForSurah(surahNumber) {
  const list = await getSurahPageMap();
  return list.find((s) => s.surah === surahNumber)?.page ?? null;
}

export async function pageForJuz(juzNumber) {
  const list = await getJuzPageMap();
  return list.find((j) => j.juz === juzNumber)?.page ?? null;
}
