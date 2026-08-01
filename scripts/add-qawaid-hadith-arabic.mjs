import fs from "node:fs";

const path = "src/data/mutoon/qawaid-al-arba.json";
const data = JSON.parse(fs.readFileSync(path, "utf-8").replace(/^﻿/, ""));

function extractBetween(haystack, start, end) {
  const startIdx = haystack.indexOf(start);
  if (startIdx === -1) throw new Error("Start marker not found: " + start);
  const from = startIdx + start.length;
  const endIdx = haystack.indexOf(end, from);
  if (endIdx === -1) throw new Error("End marker not found: " + end);
  return haystack.slice(from, endIdx);
}

const treesItem = data.sections
  .find((s) => s.number === 3)
  .paragraphs[1].items.find((i) => i.label === "الْأَشْجَارُ وَالْأَحْجَارُ");

const dhaatAnwaatHadith = extractBetween(
  treesItem.arabic,
  "وَحَدِيثُ أَبِي وَاقِدٍ اللَّيْثِيِّ رَضِيَ اللَّهُ عَنْهُ قَالَ: «",
  "»"
);

const target = data.hadiths.find((h) => h.source.includes("2180"));
if (!target) throw new Error("Dhaat Anwaat hadith entry not found in hadiths array");

target.arabic = dhaatAnwaatHadith;
target.translation =
  "We went out with the Messenger of Allah (peace be upon him) to Hunayn, and we had only recently left disbelief. The mushrikeen had a lote-tree which they used to sit beside in devotion and on which they would hang their weapons; it was called Dhaat Anwaat. We passed by a lote-tree and said, \"O Messenger of Allah, make for us a Dhaat Anwaat just as they have a Dhaat Anwaat.\" The Messenger of Allah said, \"Allah is the Greatest! These are the [old] ways. By the One in Whose Hand is my soul, you have said just as the Children of Israel said to Musa: 'Make for us a god just as they have gods.'\"";

fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("OK: added Arabic to the Dhaat Anwaat hadith entry.");
console.log(dhaatAnwaatHadith);
