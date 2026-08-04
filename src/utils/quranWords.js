// Pure helpers shared between SurahReader (word-by-word rendering) and
// AudioPlayerContext (the actual playback engine, which needs the same
// word counts/boundaries to preload correctly and to estimate the
// "currently playing" ayah for reciters with only one continuous file per
// surah). Moved out of SurahReader.jsx so both can import the same
// logic instead of it drifting into two copies.

// Quranic annotation marks (rub-el-hizb "۞" and the small waqf/pause
// ligatures "ۖۗۙۚۛ") appear as their own space-separated tokens in the
// Uthmani text but aren't real words — quran.com's own word tokenization
// (which the real per-word timing segments are keyed against) doesn't count
// them either. Folding them into the adjacent word keeps our word count
// aligned with quran.com's so segmentsMatchWordCount actually matches.
export function isAnnotationMark(token) {
  return /^[۞ۖ-ۜ]+$/.test(token);
}

// Splits an ayah's Arabic text into its words for word-by-word highlighting.
export function getVerseWords(verse) {
  const raw = verse.arabic.split(/\s+/).filter(Boolean);
  const merged = [];
  for (const token of raw) {
    if (isAnnotationMark(token) && merged.length > 0) {
      merged[merged.length - 1] += " " + token;
    } else {
      merged.push(token);
    }
  }
  // A leading mark (e.g. ۞ at the start of a Rub' al-Hizb) has no previous
  // word yet — fold it into the word that follows instead.
  if (merged.length > 1 && isAnnotationMark(merged[0])) {
    merged[1] = merged[0] + " " + merged[1];
    merged.shift();
  }
  return merged;
}

// For reciters with no per-word (or even per-verse) timing data at all —
// i.e. one continuous file for the whole surah — each ayah's "playing"
// window is estimated as proportional to its word count within the audio's
// actual real-time duration. This isn't word-level precision, but keeps the
// highlighted ayah roughly in sync as the recording progresses, as opposed
// to no tracking at all.
export function computeVerseBoundaries(surah) {
  const counts = surah.verses.map((v) => Math.max(1, getVerseWords(v).length));
  const total = counts.reduce((sum, c) => sum + c, 0);
  let cumulative = 0;
  return surah.verses.map((v, i) => {
    const start = cumulative / total;
    cumulative += counts[i];
    return { verseNumber: v.number, start, end: cumulative / total };
  });
}

export function verseAtFraction(boundaries, fraction) {
  for (const b of boundaries) {
    if (fraction >= b.start && fraction < b.end) return b.verseNumber;
  }
  return boundaries.length > 0 ? boundaries[boundaries.length - 1].verseNumber : null;
}
