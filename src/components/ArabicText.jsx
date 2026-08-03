// Standalone waqf/pause signs (ۖ ۗ ۘ ۙ ۚ ۛ ۜ — U+06D6-06DC) are written in
// Uthmani Quran text as their own space-separated token, not attached to any
// letter. They're rendered in a different font (Amiri Quran, swapped in via
// unicode-range in index.css, since Scheherazade New's own versions of these
// glyphs render oversized) than the surrounding letters/harakat. A mark with
// no letter of its own relies on its font's mark-to-base GPOS positioning to
// land correctly — but that can't run across a font/text-run boundary, so the
// mark's raw, un-repositioned glyph outline renders at its own design origin
// instead, which collides with the previous word. Wrapping the mark in its
// own element gives it a real, independent layout box, so ordinary CSS
// spacing — not cross-font mark attachment — controls where it sits.
const WAQF_MARK = /([ۖ-ۜ])/g;

export default function ArabicText({ text }) {
  if (!text) return null;
  return text
    .split(WAQF_MARK)
    .map((part, i) => (i % 2 === 1 ? <span className="waqf-mark" key={i}>{part}</span> : part));
}
