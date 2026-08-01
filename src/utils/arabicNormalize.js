// Strips Arabic diacritics (tashkeel) and Quranic Uthmani annotation marks,
// and folds common letter-shape variants together, so a plain-typed query
// like "الصبر" matches the fully-vocalized Mushaf text "ٱلصَّبْر".
//
// Built from numeric codepoint escapes (not pasted glyphs) to avoid any
// ambiguity from bidirectional text reordering. Ranges covered: U+0610-061A
// (honorific/Quranic signs), U+064B-065F (the main harakat block), U+0670
// (superscript alef), U+06D6-06DC, U+06DF-06E4, U+06E7-06E8, U+06EA-06ED
// (Quranic pause/tajweed annotation marks), U+0640 (tatweel elongation).
const DIACRITICS_RE = new RegExp(
  "[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED\\u0640]",
  "g"
);

// Letter-shape folding, also built from codepoint escapes for the same
// reason: آ آ, أ أ, إ إ, ٱ ٱ, ا ا -> ا
const ALEF_RE = new RegExp("[\\u0622\\u0623\\u0625\\u0671\\u0627]", "g");
// ى ى, ی ی -> ي (ي)
const YA_RE = new RegExp("[\\u0649\\u06CC]", "g");
const TA_MARBUTA_RE = new RegExp("\\u0629", "g"); // ة -> ه
const WAW_HAMZA_RE = new RegExp("\\u0624", "g"); // ؤ -> و
const YA_HAMZA_RE = new RegExp("\\u0626", "g"); // ئ -> ي

export function normalizeArabic(text) {
  if (!text) return "";
  return text
    .replace(DIACRITICS_RE, "")
    .replace(ALEF_RE, "ا")
    .replace(YA_RE, "ي")
    .replace(TA_MARBUTA_RE, "ه")
    .replace(WAW_HAMZA_RE, "و")
    .replace(YA_HAMZA_RE, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function isArabicText(text) {
  return new RegExp("[\\u0600-\\u06FF]").test(text);
}
