// Real per-word recitation timing, sourced from quran.com's API. Their
// `fields=segments` parameter (undocumented in the public API reference, but
// live and functional) returns, per ayah, an array of
// [startWordIndex, endWordIndexExclusive, startMs, endMs] segments — the
// same data quran.com's own site uses to drive word-by-word highlighting
// during playback. This is real per-word timestamp data, not an estimate.
//
// Coverage is limited to the specific reciter recordings quran.com has
// tokenized this way. Confirmed present for all 5 of this app's per-verse
// reciters (recitation IDs below), tested against both short (1:2) and long
// (2:255, 50 words) ayat.
const QURAN_COM_RECITATION_IDS = {
  minshawy: 9, // Mohamed Siddiq al-Minshawi, Murattal
  abdulbasit: 2, // AbdulBaset AbdulSamad, Murattal
  husary: 6, // Mahmoud Khalil Al-Husary
  shuraym: 10, // Sa`ud ash-Shuraym
  sudais: 3, // Abdur-Rahman as-Sudais
};

const chapterCache = new Map(); // `${recitationId}:${surah}` -> Promise<Map<verseKey, {url, segments}>>

export function getQuranComRecitationId(reciterId) {
  return QURAN_COM_RECITATION_IDS[reciterId] || null;
}

function resolveAudioUrl(rawUrl) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("http")) return rawUrl;
  if (rawUrl.startsWith("//")) return `https:${rawUrl}`;
  return `https://verses.quran.com/${rawUrl}`;
}

// Fetches word-timing segments (and each ayah's canonical audio URL) for an
// entire surah in one request, cached in memory per (reciter, surah) since
// it's the same data for every visitor. Returns null on any failure so
// callers can fall back to ayah-level highlighting without word timing.
export async function fetchChapterWordTiming(reciterId, surahNumber) {
  const recitationId = getQuranComRecitationId(reciterId);
  if (!recitationId) return null;

  const cacheKey = `${recitationId}:${surahNumber}`;
  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey);

  const promise = (async () => {
    try {
      const res = await fetch(
        `https://api.quran.com/api/v4/quran/recitations/${recitationId}?chapter_number=${surahNumber}&fields=segments`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const map = new Map();
      for (const af of json.audio_files || []) {
        map.set(af.verse_key, {
          url: resolveAudioUrl(af.url),
          segments: Array.isArray(af.segments) && af.segments.length > 0 ? af.segments : null,
        });
      }
      return map;
    } catch {
      return null;
    }
  })();

  chapterCache.set(cacheKey, promise);
  return promise;
}

// A segment's word range only matches our own rendering if both sources
// tokenized the ayah into the same number of words — true for essentially
// every ayah, but checked defensively so a rare mismatch degrades to
// ayah-level highlighting instead of highlighting the wrong word.
export function segmentsMatchWordCount(segments, wordCount) {
  if (!segments || segments.length === 0 || !wordCount) return false;
  const maxEnd = segments.reduce((max, [, end]) => Math.max(max, end), 0);
  return maxEnd === wordCount;
}

// Returns the { start, end } (end-exclusive) word range active at `timeMs`
// of real playback time, or null if no segment covers that instant (e.g.
// the trailing silence after the last word).
export function wordRangeAtTime(segments, timeMs) {
  if (!segments) return null;
  for (const [start, end, startMs, endMs] of segments) {
    if (timeMs >= startMs && timeMs < endMs) {
      return { start, end };
    }
  }
  return null;
}
