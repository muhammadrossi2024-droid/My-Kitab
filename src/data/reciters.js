// Reciters available for verse-by-verse audio, all served from the same
// everyayah.com data source used for the original Al-Minshawi recitation
// (https://everyayah.com/data/{folder}/{surah}{ayah}.mp3). Folder names are
// everyayah.com's own directory names and must match exactly.
export const reciters = [
  { id: "minshawy", name: "Al-Minshawi (Murattal)", folder: "Minshawy_Murattal_128kbps" },
  { id: "abdulbasit", name: "Abdul Basit Abdul Samad (Murattal)", folder: "Abdul_Basit_Murattal_192kbps" },
  { id: "husary", name: "Mahmoud Khalil Al-Husary", folder: "Husary_128kbps" },
  { id: "shuraym", name: "Saud Al-Shuraim", folder: "Saood_ash-Shuraym_128kbps" },
  { id: "sudais", name: "Abdur-Rahman As-Sudais", folder: "Abdurrahmaan_As-Sudais_192kbps" },
];

export const DEFAULT_RECITER_ID = "minshawy";

export function getReciterFolder(reciterId) {
  const match = reciters.find((r) => r.id === reciterId);
  return (match || reciters[0]).folder;
}
