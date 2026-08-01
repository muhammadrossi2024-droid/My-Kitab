// Reciters available for audio playback.
//
// Most reciters are "per-verse": served from everyayah.com, one mp3 file per
// ayah (https://everyayah.com/data/{folder}/{surah}{ayah}.mp3). This is what
// supports per-verse play/seek, word highlighting, and per-verse offline
// caching.
//
// Haitham Al-Dukhan is "full-surah": everyayah.com, quran.com, and AlQuran
// Cloud/islamic.network all lack a per-ayah recording of him. The only
// source found (mp3quran.net) only hosts one mp3 per whole surah
// (https://server16.mp3quran.net/h_dukhain/Rewayat-Hafs-A-n-Assem/{surah}.mp3),
// so this reciter plays as one continuous file per surah instead — no
// per-verse seek, word highlighting, or per-verse offline download.
// `quranComId` is the recitation ID quran.com uses for its `fields=segments`
// API, which returns real per-word timestamp data (see src/utils/wordTiming
// .js). Only reciters with this ID support "Word-by-word" follow-along;
// everyone else (currently just Haitham Al-Dukhan) is limited to
// ayah-by-ayah tracking since no source provides per-word timing for them.
export const reciters = [
  { id: "minshawy", type: "per-verse", name: "Al-Minshawi (Murattal)", folder: "Minshawy_Murattal_128kbps", quranComId: 9 },
  { id: "abdulbasit", type: "per-verse", name: "Abdul Basit Abdul Samad (Murattal)", folder: "Abdul_Basit_Murattal_192kbps", quranComId: 2 },
  { id: "husary", type: "per-verse", name: "Mahmoud Khalil Al-Husary", folder: "Husary_128kbps", quranComId: 6 },
  { id: "shuraym", type: "per-verse", name: "Saud Al-Shuraim", folder: "Saood_ash-Shuraym_128kbps", quranComId: 10 },
  { id: "sudais", type: "per-verse", name: "Abdur-Rahman As-Sudais", folder: "Abdurrahmaan_As-Sudais_192kbps", quranComId: 3 },
  {
    id: "dukhan",
    type: "full-surah",
    name: "Haitham Al-Dukhan (full surah only)",
    surahBaseUrl: "https://server16.mp3quran.net/h_dukhain/Rewayat-Hafs-A-n-Assem/",
  },
];

export const DEFAULT_RECITER_ID = "minshawy";

export function getReciter(reciterId) {
  return reciters.find((r) => r.id === reciterId) || reciters[0];
}

export function isFullSurahReciter(reciterId) {
  return getReciter(reciterId).type === "full-surah";
}

export function supportsWordTiming(reciterId) {
  return Boolean(getReciter(reciterId).quranComId);
}

export function getQuranComRecitationId(reciterId) {
  return getReciter(reciterId).quranComId || null;
}

export function getReciterFolder(reciterId) {
  const r = getReciter(reciterId);
  return r.type === "per-verse" ? r.folder : reciters.find((x) => x.type === "per-verse").folder;
}

export function surahAudioUrl(surahNumber, reciterId) {
  const r = getReciter(reciterId);
  const s = String(surahNumber).padStart(3, "0");
  return `${r.surahBaseUrl}${s}.mp3`;
}
