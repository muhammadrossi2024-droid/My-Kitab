import { DEFAULT_RECITER_ID, getReciterFolder } from "../data/reciters.js";

export function verseAudioUrl(surahNumber, verseNumber, reciterId = DEFAULT_RECITER_ID) {
  const s = String(surahNumber).padStart(3, "0");
  const a = String(verseNumber).padStart(3, "0");
  const folder = getReciterFolder(reciterId);
  return `https://everyayah.com/data/${folder}/${s}${a}.mp3`;
}
