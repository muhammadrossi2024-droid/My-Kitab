import fs from "node:fs";

const path = "src/data/mutoon/qawaid-al-arba.json";
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

// Qaidah 1: short enough already — wrap as a single-element paragraphs array.
{
  const s = data.sections[0];
  s.paragraphs = [s.arabic];
  delete s.arabic;
}

// Qaidah 2: the two types of shafa'ah (منفية / مثبتة).
{
  const s = data.sections[1];
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "فَالشَّفَاعَةُ الْمَنْفِيَّةُ:",
    "وَالشَّفَاعَةُ الْمُثْبَتَةُ:",
  ]);
  assertMatches(original, parts, "section[1]");
  s.paragraphs = [
    parts[0],
    {
      type: "list",
      lead: null,
      items: [
        { label: "الشَّفَاعَةُ الْمَنْفِيَّةُ", arabic: parts[1] },
        { label: "الشَّفَاعَةُ الْمُثْبَتَةُ", arabic: parts[2] },
      ],
    },
  ];
  delete s.arabic;
}

// Qaidah 3: the four categories of pre-Islamic polytheists + their evidences.
{
  const s = data.sections[2];
  const original = s.arabic;
  const parts = splitAtMarkers(original, [
    "فَدَلِيلُ الشَّمْسِ وَالْقَمَرِ؛",
    "وَدَلِيلُ الْمَلَائِكَةِ؛",
    "وَدَلِيلُ الْأَنْبِيَاءِ؛",
    "وَدَلِيلُ الصَّالِحِينَ؛",
    "وَدَلِيلُ الْأَشْجَارِ وَالْأَحْجَارِ؛",
  ]);
  assertMatches(original, parts, "section[2]");
  s.paragraphs = [
    parts[0],
    {
      type: "list",
      lead: null,
      items: [
        { label: "الشَّمْسُ وَالْقَمَرُ", arabic: parts[1] },
        { label: "الْمَلَائِكَةُ", arabic: parts[2] },
        { label: "الْأَنْبِيَاءُ", arabic: parts[3] },
        { label: "الصَّالِحُونَ", arabic: parts[4] },
        { label: "الْأَشْجَارُ وَالْأَحْجَارُ", arabic: parts[5] },
      ],
    },
  ];
  delete s.arabic;
}

// Qaidah 4: short enough already.
{
  const s = data.sections[3];
  s.paragraphs = [s.arabic];
  delete s.arabic;
}

for (const p of data.introParagraphs) delete p.verseRefs;
for (const s of data.sections) delete s.verseRefs;

fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("OK: qawaid-al-arba.json restructured and verified.");
