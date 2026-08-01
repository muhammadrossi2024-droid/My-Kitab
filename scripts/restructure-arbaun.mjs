import fs from "node:fs";

const path = "src/data/mutoon/arbaun-nawawiyyah.json";
const data = JSON.parse(fs.readFileSync(path, "utf-8").replace(/^﻿/, ""));

function splitAtMarkers(text, markers) {
  const positions = markers.map((m) => {
    const idx = text.indexOf(m);
    if (idx === -1) throw new Error("Marker not found: " + m);
    return idx;
  });
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) throw new Error("Markers out of order at: " + markers[i]);
  }
  const bounds = [0, ...positions, text.length];
  const parts = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const part = text.slice(bounds[i], bounds[i + 1]).trim();
    if (part) parts.push(part);
  }
  return parts;
}

function assertMatches(original, parts, label) {
  const a = original.replace(/\s+/g, " ").trim();
  const b = parts.join(" ").replace(/\s+/g, " ").trim();
  if (a !== b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.error(`MISMATCH in ${label} at index ${i}`);
        console.error("ORIGINAL:", JSON.stringify(a.slice(Math.max(0, i - 40), i + 40)));
        console.error("REBUILT :", JSON.stringify(b.slice(Math.max(0, i - 40), i + 40)));
        break;
      }
    }
    throw new Error(`Reconstruction mismatch in ${label}`);
  }
}

const byNumber = (n) => data.sections.find((s) => s.number === n);

// Hadith 2 (Jibril): paragraph break per question.
{
  const s = byNumber(2);
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "فَقَالَ رَسُولُ اللَّهِ ﷺ: الْإِسْلَامُ:",
    "قَالَ: فَأَخْبِرْنِي عَنِ الْإِيمَانِ؟",
    "قَالَ: فَأَخْبِرْنِي عَنِ الْإِحْسَانِ؟",
    "قَالَ: فَأَخْبِرْنِي عَنِ السَّاعَةِ؟",
    "قَالَ: فَأَخْبِرْنِي عَنْ أَمَارَاتِهَا؟",
    "قَالَ: ثُمَّ انْطَلَقَ",
  ]);
  assertMatches(original, parts, "hadith 2");
  s.paragraphs = parts;
  delete s.arabic;
}

// Hadith 19 (Ibn Abbas): paragraph break per maxim / narration.
{
  const s = byNumber(19);
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "إِذَا سَأَلْتَ فَاسْأَلِ اللَّهَ",
    "وَاعْلَمْ أَنَّ الْأُمَّةَ",
    "وَفِي رِوَايَةٍ غَيْرِ التِّرْمِذِيِّ",
    "وَاعْلَمْ أَنَّ مَا أَخْطَأَكَ",
    "وَاعْلَمْ أَنَّ النَّصْرَ",
  ]);
  assertMatches(original, parts, "hadith 19");
  s.paragraphs = parts;
  delete s.arabic;
}

// Hadith 24 (Qudsi, "O My servants"): the ten repeated "يا عبادي" sayings as
// a list — the matn's own natural enumerated structure.
{
  const s = byNumber(24);
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "«يَا عِبَادِي! إِنِّي حَرَّمْتُ",
    "يَا عِبَادِي! كُلُّكُمْ ضَالٌّ",
    "يَا عِبَادِي! كُلُّكُمْ جَائِعٌ",
    "يَا عِبَادِي! كُلُّكُمْ عَارٍ",
    "يَا عِبَادِي! إِنَّكُمْ تُخْطِئُونَ",
    "يَا عِبَادِي! إِنَّكُمْ لَنْ تَبْلُغُوا",
    "يَا عِبَادِي! لَوْ أَنَّ أَوَّلَكُمْ وَآخِرَكُمْ وَإِنْسَكُمْ وَجِنَّكُمْ كَانُوا عَلَى أَتْقَى",
    "يَا عِبَادِي! لَوْ أَنَّ أَوَّلَكُمْ وَآخِرَكُمْ وَإِنْسَكُمْ وَجِنَّكُمْ كَانُوا عَلَى أَفْجَرِ",
    "يَا عِبَادِي! لَوْ أَنَّ أَوَّلَكُمْ وَآخِرَكُمْ وَإِنْسَكُمْ وَجِنَّكُمْ قَامُوا",
    "يَا عِبَادِي! إِنَّمَا هِيَ أَعْمَالُكُمْ",
  ]);
  assertMatches(original, parts, "hadith 24");
  s.paragraphs = [
    parts[0] + " «",
    {
      type: "list",
      lead: null,
      items: parts.slice(1).map((arabic) => ({
        label: "يَا عِبَادِي",
        arabic: arabic.replace(/^«\s*/, ""),
      })),
    },
  ];
  delete s.arabic;
}

// Hadith 29 (Mu'adh): paragraph break per "ثم قال" turn.
{
  const s = byNumber(29);
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "ثُمَّ قَالَ: أَلَا أَدُلُّكَ",
    "ثُمَّ قَالَ: أَلَا أُخْبِرُكَ بِرَأْسِ",
    "ثُمَّ قَالَ: أَلَا أُخْبِرُكَ بِمِلَاكِ",
    "قُلْتُ: يَا نَبِيَّ اللَّهِ!",
  ]);
  assertMatches(original, parts, "hadith 29");
  s.paragraphs = parts;
  delete s.arabic;
}

// Wrap every other (short) hadith's arabic string in a single-element
// paragraphs array too, so the renderer only needs to handle one shape.
for (const s of data.sections) {
  if (!s.paragraphs) {
    s.paragraphs = [s.arabic];
    delete s.arabic;
  }
  delete s.verseRefs;
}

fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("OK: arbaun-nawawiyyah.json restructured and verified.");
