import fs from "node:fs";

const path = "src/data/mutoon/usul-al-thalathah.json";
const data = JSON.parse(fs.readFileSync(path, "utf-8").replace(/^﻿/, ""));

function extractBetween(haystack, start, end) {
  const startIdx = haystack.indexOf(start);
  if (startIdx === -1) throw new Error("Start marker not found: " + start);
  const from = startIdx + start.length;
  const endIdx = haystack.indexOf(end, from);
  if (endIdx === -1) throw new Error("End marker not found: " + end);
  return haystack.slice(from, endIdx);
}

const s1p4 = data.sections[0].paragraphs[3];
const istianaItem = data.sections[0].paragraphs[4].items.find((i) => i.label === "الِاسْتِعَانَةُ");
const dhabhItem = data.sections[0].paragraphs[4].items.find((i) => i.label === "الذَّبْحُ");
const jibrilPara = data.sections[1].paragraphs[2];
const hijrahPara = data.sections[2].paragraphs[3];
const raasPara = data.sections[2].paragraphs[8];

const duaHadith = extractBetween(s1p4, "وَفِي الْحَدِيثِ: «", "»");
const istianaHadith = extractBetween(istianaItem.arabic, "وَفِي الْحَدِيثِ: «", "»");
const dhabhHadith = extractBetween(dhabhItem.arabic, "وَمِنَ السُّنَّةِ: «", "»");
const jibrilHadith = extractBetween(jibrilPara, "عَنْ عُمَرَ رَضِيَ اللَّهُ عَنْهُ قَالَ: «", "»");
const hijrahHadith = extractBetween(hijrahPara, "قَوْلُهُ ﷺ: «", "»");
const raasHadith = extractBetween(raasPara, "وَفِي الْحَدِيثِ: «", "»");

data.hadiths = [
  {
    arabic: duaHadith,
    translation: "Supplication is the essence of worship.",
    source: "Sunan at-Tirmidhi",
  },
  {
    arabic: istianaHadith,
    translation: "And if you seek help, seek help from Allah.",
    source: "Sunan at-Tirmidhi (Hasan Sahih) — part of the hadith of Ibn 'Abbas",
  },
  {
    arabic: dhabhHadith,
    translation: "Allah has cursed whoever slaughters [an offering] for other than Allah.",
    source: "Sahih Muslim",
  },
  {
    arabic: jibrilHadith,
    translation:
      "While we were sitting with the Messenger of Allah (peace be upon him) one day, a man appeared before us whose clothes were extremely white and whose hair was extremely black; no traces of a journey could be seen on him, and none of us recognized him. He sat down close by the Prophet (peace be upon him), resting his knees against his knees and placing his palms on his thighs, and said: \"O Muhammad, tell me about Islam.\" The Messenger of Allah (peace be upon him) said: \"Islam is to testify that there is no god but Allah and that Muhammad is the Messenger of Allah, to perform the prayer, to pay the zakah, to fast Ramadan, and to make the pilgrimage to the House if you are able to do so.\" He said, \"You have spoken rightly,\" and we were amazed that he would ask and then confirm the answer. He said, \"Then tell me about faith (iman).\" He said: \"It is to believe in Allah, His angels, His books, His messengers, and the Last Day, and to believe in divine decree, its good and its evil.\" He said, \"You have spoken rightly.\" He said, \"Then tell me about excellence (ihsan).\" He said: \"It is to worship Allah as though you see Him, and if you do not see Him, then indeed He sees you.\" He said, \"Then tell me about the Hour.\" He said: \"The one asked about it knows no more than the one asking.\" He said, \"Then tell me about its signs.\" He said: \"That the slave-girl will give birth to her mistress, and that you will see the barefoot, naked, destitute herdsmen competing in constructing tall buildings.\" Then he left, and I stayed for a time. Then he [the Prophet] said to me, \"O 'Umar, do you know who the questioner was?\" I said, \"Allah and His Messenger know best.\" He said, \"That was Jibril; he came to teach you your religion.\"",
    source: "Agreed upon (Sahih al-Bukhari and Sahih Muslim), narrated by 'Umar ibn al-Khattab — \"the well-known Hadith of Jibril\"",
  },
  {
    arabic: hijrahHadith,
    translation:
      "Hijrah (emigration for the sake of Allah) will not cease until repentance ceases, and repentance will not cease until the sun rises from the west.",
    source: "Sunan Abi Dawud / Musnad Ahmad, narrated by Mu'awiyah ibn Abi Sufyan",
  },
  {
    arabic: raasHadith,
    translation:
      "The head of the matter is Islam, its pillar is prayer, and the peak of its hump is jihad in the way of Allah.",
    source: "Sunan at-Tirmidhi (Hasan Sahih) — part of the hadith of Mu'adh ibn Jabal",
  },
];

fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log(`OK: added ${data.hadiths.length} hadiths to usul-al-thalathah.json`);
for (const h of data.hadiths) {
  console.log(" -", h.arabic.slice(0, 40).replace(/\n/g, " "), "...");
}
