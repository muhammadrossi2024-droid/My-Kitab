import { verseAudioUrl } from "./audio.js";
import { DEFAULT_RECITER_ID } from "../data/reciters.js";

const CACHE_NAME = "quran-offline-v1";
const DOWNLOADED_KEY = "quran-app:downloaded-surahs";

// Downloaded surahs are tracked per reciter (key: "surahNumber:reciterId")
// since each reciter's audio is a distinct set of cached files.
function downloadKey(surahNumber, reciterId) {
  return `${surahNumber}:${reciterId}`;
}

// The Cache Storage API only exists in secure contexts (https:// or
// http://localhost). Visiting the dev server from another device over the
// LAN (e.g. http://192.168.x.x:5173) is plain, non-localhost HTTP, so
// `caches` is undefined there — every function below has to tolerate that
// and fall back to a plain network fetch instead of throwing.
export function hasCacheSupport() {
  return typeof caches !== "undefined";
}

function readDownloadedList() {
  try {
    const raw = localStorage.getItem(DOWNLOADED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeDownloadedList(set) {
  localStorage.setItem(DOWNLOADED_KEY, JSON.stringify(Array.from(set)));
}

export function isSurahDownloaded(surahNumber, reciterId = DEFAULT_RECITER_ID) {
  return readDownloadedList().has(downloadKey(surahNumber, reciterId));
}

export function getDownloadedSurahs() {
  return Array.from(readDownloadedList());
}

// Downloads a surah's JSON + every verse's audio into Cache Storage so the
// surah can be read and listened to with no network connection at all.
// `onProgress(done, total)` is called as each item finishes.
export async function downloadSurah(surah, onProgress, reciterId = DEFAULT_RECITER_ID) {
  if (!hasCacheSupport()) {
    throw new Error(
      "Offline download isn't available here — this needs a secure connection (https://, or localhost on this same PC)."
    );
  }
  const cache = await caches.open(CACHE_NAME);
  const jsonUrl = `/data/surahs/${surah.number}.json`;
  const audioUrls = surah.verses.map((v) => verseAudioUrl(surah.number, v.number, reciterId));
  const allUrls = [jsonUrl, ...audioUrls];

  let done = 0;
  for (const url of allUrls) {
    const alreadyCached = await cache.match(url);
    if (!alreadyCached) {
      const res = await fetch(url);
      if (res.ok) await cache.put(url, res.clone());
    }
    done += 1;
    onProgress?.(done, allUrls.length);
  }

  const set = readDownloadedList();
  set.add(downloadKey(surah.number, reciterId));
  writeDownloadedList(set);
}

export async function removeSurahDownload(surah, reciterId = DEFAULT_RECITER_ID) {
  if (!hasCacheSupport()) return;
  const cache = await caches.open(CACHE_NAME);
  const jsonUrl = `/data/surahs/${surah.number}.json`;
  await cache.delete(jsonUrl);
  for (const v of surah.verses) {
    await cache.delete(verseAudioUrl(surah.number, v.number, reciterId));
  }
  const set = readDownloadedList();
  set.delete(downloadKey(surah.number, reciterId));
  writeDownloadedList(set);
}

// Reads a surah's JSON, preferring the offline cache over the network.
export async function fetchSurahJson(surahNumber) {
  const url = `/data/surahs/${surahNumber}.json`;
  if (hasCacheSupport()) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) return cached.json();
    } catch {
      // fall through to a plain network fetch
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("not scraped yet");
  return res.json();
}

// Looks up a previously-downloaded verse's audio in Cache Storage, returning
// a blob: URL if present or null otherwise (never falls through to a live
// network fetch — callers decide what to use when there's no cached copy).
export async function getCachedAudioBlob(remoteUrl) {
  if (!hasCacheSupport()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(remoteUrl);
    if (!cached) return null;
    const blob = await cached.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
