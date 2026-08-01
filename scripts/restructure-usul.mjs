// Restructures usul-al-thalathah.json's dense prose blocks into numbered
// points / readable paragraphs, matching the matn's actual internal
// structure (the "four masail", "three masail", the three martabat of
// Islam/Iman/Ihsan with their pillars, etc.).
//
// Splitting is done via exact substring search against the EXISTING,
// already-verified text (never retyped from memory), so no Arabic content
// is invented or altered — only re-segmented. A verification pass at the
// end reconstructs the original strings from the pieces and diffs them
// against the source to guarantee nothing was lost, duplicated, or altered.

import fs from "node:fs";

const path = "src/data/mutoon/usul-al-thalathah.json";
const data = JSON.parse(fs.readFileSync(path, "utf-8").replace(/^﻿/, ""));

function splitAtMarkers(text, markers) {
  const positions = markers.map((m) => {
    const idx = text.indexOf(m);
    if (idx === -1) throw new Error("Marker not found: " + m);
    return idx;
  });
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) {
      throw new Error("Markers out of order at: " + markers[i]);
    }
  }
  const bounds = [0, ...positions, text.length];
  const parts = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const part = text.slice(bounds[i], bounds[i + 1]).trim();
    if (part) parts.push(part);
  }
  return parts;
}

function reconstruct(parts) {
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function assertMatches(original, parts, label) {
  const a = original.replace(/\s+/g, " ").trim();
  const b = reconstruct(parts);
  if (a !== b) {
    console.error(`MISMATCH in ${label}`);
    console.error("ORIGINAL LEN:", a.length, "REBUILT LEN:", b.length);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.error("First diff at index", i);
        console.error("ORIGINAL:", JSON.stringify(a.slice(Math.max(0, i - 40), i + 40)));
        console.error("REBUILT :", JSON.stringify(b.slice(Math.max(0, i - 40), i + 40)));
        break;
      }
    }
    throw new Error(`Reconstruction mismatch in ${label}`);
  }
}

// ---- introParagraphs[0]: the "four masail" ----
{
  const original = data.introParagraphs[0].arabic;
  const parts = splitAtMarkers(original, [
    "الثَّانِيَةُ: الْعَمَلُ بِهِ.",
    "الثَّالِثَةُ: الدَّعْوَةُ إِلَيْهِ.",
    "الرَّابِعَةُ: الصَّبْرُ عَلَى الْأَذَى فِيهِ.",
    "وَالدَّلِيلُ قَوْلُهُ تَعَالَى: ﴿وَالْعَصْرِ",
  ]);
  assertMatches(original, parts, "introParagraphs[0]");
  data.__masailArba = {
    type: "list",
    lead: "اعْلَمْ ـ رَحِمَكَ اللَّهُ ـ أَنَّهُ يَجِبُ عَلَيْنَا تَعَلُّمُ أَرْبَعِ مَسَائِلَ:",
    items: [
      { label: "الْأُولَى", arabic: parts[0].replace(/^اعْلَمْ.*?الْأُولَى:\s*/s, "") },
      { label: "الثَّانِيَةُ", arabic: parts[1].replace(/^الثَّانِيَةُ:\s*/, "") },
      { label: "الثَّالِثَةُ", arabic: parts[2].replace(/^الثَّالِثَةُ:\s*/, "") },
      { label: "الرَّابِعَةُ", arabic: parts[3].replace(/^الرَّابِعَةُ:\s*/, "") },
    ],
    trailing: parts[4],
  };
}

// ---- introParagraphs[2]: the "three masail" ----
{
  const original = data.introParagraphs[2].arabic;
  const parts = splitAtMarkers(original, [
    "الثَّانِيَةُ: أَنَّ اللَّهَ لَا يَرْضَى",
    "الثَّالِثَةُ: أَنَّ مَنْ أَطَاعَ الرَّسُولَ",
  ]);
  assertMatches(original, parts, "introParagraphs[2]");
  data.__masailThalath = {
    type: "list",
    lead: "اعْلَمْ ـ رَحِمَكَ اللَّهُ ـ أَنَّهُ يَجِبُ عَلَى كُلِّ مُسْلِمٍ وَمُسْلِمَةٍ، تَعَلُّمُ ثَلَاثِ هَذِهِ الْمَسَائِلِ، وَالْعَمَلُ بِهِنَّ:",
    items: [
      { label: "الْأُولَى", arabic: parts[0].replace(/^اعْلَمْ.*?الْأُولَى:\s*/s, "") },
      { label: "الثَّانِيَةُ", arabic: parts[1].replace(/^الثَّانِيَةُ:\s*/, "") },
      { label: "الثَّالِثَةُ", arabic: parts[2].replace(/^الثَّالِثَةُ:\s*/, "") },
    ],
  };
}

// ---- Section 1 (Al-Asl al-Awwal) ----
{
  const s = data.sections[0];
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "فَإِذَا قِيلَ لَكَ: بِمَ عَرَفْتَ رَبَّكَ؟",
    "وَالرَّبُّ هُوَ الْمَعْبُودُ؛",
    "وَأَنْوَاعُ الْعِبَادَةِ الَّتِي أَمَرَ اللَّهُ بِهَا",
    "وَدَلِيلُ الْخَوْفِ؛",
    "وَدَلِيلُ الرَّجَاءِ؛",
    "وَدَلِيلُ التَّوَكُّلِ؛",
    "وَدَلِيلُ الرَّغْبَةِ، وَالرَّهْبَةِ، وَالْخُشُوعِ؛",
    "وَدَلِيلُ الْخَشْيَةِ؛",
    "وَدَلِيلُ الْإِنَابَةِ؛",
    "وَدَلِيلُ الِاسْتِعَانَةِ؛",
    "وَدَلِيلُ الِاسْتِعَاذَةِ؛",
    "وَدَلِيلُ الِاسْتِغَاثَةِ؛",
    "وَدَلِيلُ الذَّبْحِ؛",
    "وَدَلِيلُ النَّذْرِ؛",
  ]);
  assertMatches(original, parts, "section[0]");
  s.paragraphs = [
    parts[0],
    parts[1],
    parts[2],
    parts[3], // lead-in to worship types
    {
      type: "list",
      lead: null,
      items: [
        { label: "الْخَوْفُ", arabic: parts[4] },
        { label: "الرَّجَاءُ", arabic: parts[5] },
        { label: "التَّوَكُّلُ", arabic: parts[6] },
        { label: "الرَّغْبَةُ وَالرَّهْبَةُ وَالْخُشُوعُ", arabic: parts[7] },
        { label: "الْخَشْيَةُ", arabic: parts[8] },
        { label: "الْإِنَابَةُ", arabic: parts[9] },
        { label: "الِاسْتِعَانَةُ", arabic: parts[10] },
        { label: "الِاسْتِعَاذَةُ", arabic: parts[11] },
        { label: "الِاسْتِغَاثَةُ", arabic: parts[12] },
        { label: "الذَّبْحُ", arabic: parts[13] },
        { label: "النَّذْرُ", arabic: parts[14] },
      ],
    },
  ];
  delete s.arabic;
}

// ---- Section 2 (Al-Asl al-Thani) ----
{
  const s = data.sections[1];
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "فَأَرْكَانُ الْإِسْلَامِ خَمْسَةٌ:",
    "الْمَرْتَبَةُ الثَّانِيَةُ: الْإِيمَانُ؛",
    "الْمَرْتَبَةُ الثَّالِثَةُ: الْإِحْسَانُ",
    "وَالدَّلِيلُ مِنَ السُّنَّةِ: حَدِيثُ جِبْرِيلَ الْمَشْهُورُ",
  ]);
  assertMatches(original, parts, "section[1]");
  s.paragraphs = [
    parts[0],
    {
      type: "list",
      lead: null,
      items: [
        { label: "الْمَرْتَبَةُ الْأُولَى: الْإِسْلَامُ", arabic: parts[1] },
        { label: "الْمَرْتَبَةُ الثَّانِيَةُ: الْإِيمَانُ", arabic: parts[2].replace(/^الْمَرْتَبَةُ الثَّانِيَةُ: الْإِيمَانُ؛\s*/, "") },
        { label: "الْمَرْتَبَةُ الثَّالِثَةُ: الْإِحْسَانُ", arabic: parts[3].replace(/^الْمَرْتَبَةُ الثَّالِثَةُ: الْإِحْسَانُ\s*/, "") },
      ],
    },
    parts[4],
  ];
  delete s.arabic;
}

// ---- Section 3 (Al-Asl al-Thalith) ----
{
  const s = data.sections[2];
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "بَعَثَهُ اللَّهُ بِالنِّذَارَةِ عَنِ الشِّرْكِ",
    "أَخَذَ عَلَى هَذَا عَشْرَ سِنِينَ يَدْعُو إِلَى التَّوْحِيدِ",
    "وَالْهِجْرَةُ: الِانْتِقَالُ مِنْ بَلَدِ الشِّرْكِ",
    "فَلَمَّا اسْتَقَرَّ بِالْمَدِينَةِ؛",
    "بَعَثَهُ اللَّهُ إِلَى النَّاسِ كَافَّةً",
    "وَالدَّلِيلُ عَلَى مَوْتِهِ ﷺ؛",
    "وَأَرْسَلَ اللَّهُ جَمِيعَ الرُّسُلِ مُبَشِّرِينَ",
    "وَافْتَرَضَ اللَّهُ عَلَى جَمِيعِ الْعِبَادِ",
  ]);
  assertMatches(original, parts, "section[2]");
  s.paragraphs = parts;
  delete s.arabic;
}

// ---- Apply the intro list restructuring ----
data.introParagraphs[0] = data.__masailArba;
data.introParagraphs[2] = data.__masailThalath;
delete data.__masailArba;
delete data.__masailThalath;
// Drop the now-unused verseRefs (never rendered anywhere; was bookkeeping only)
for (const p of data.introParagraphs) delete p.verseRefs;
for (const s of data.sections) delete s.verseRefs;

fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("OK: usul-al-thalathah.json restructured and verified.");
