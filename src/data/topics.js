// A curated topic taxonomy for semantic-ish search. Each topic carries
// keyword hints in English, Arabic, and common English transliterations, so
// a query in any of the three can surface the topic (and therefore its
// tagged verses) even when the exact Arabic/English words of the ayah don't
// appear in the query.
export const topics = [
  {
    id: "tawheed",
    en: "Tawheed (Oneness of Allah)",
    ar: "التوحيد",
    keywords: {
      en: ["oneness of god", "monotheism", "allah is one", "there is no god but allah", "unity of allah"],
      ar: ["التوحيد", "الوهية", "لا اله الا الله"],
      translit: ["tawheed", "tawhid", "la ilaha illallah"],
    },
  },
  {
    id: "patience",
    en: "Patience (Sabr)",
    ar: "الصبر",
    keywords: {
      en: ["patience", "perseverance", "endurance", "steadfastness", "hardship"],
      ar: ["الصبر", "الصَّبْر", "صابر", "اصبروا"],
      translit: ["sabr", "sabar", "sabir"],
    },
  },
  {
    id: "tawakkul",
    en: "Reliance on Allah (Tawakkul)",
    ar: "التوكل على الله",
    keywords: {
      en: ["reliance on allah", "trust in god", "dependence on allah", "sufficiency of allah"],
      ar: ["التوكل", "توكل على الله", "حسبنا الله"],
      translit: ["tawakkul", "tawakkal"],
    },
  },
  {
    id: "seeking_help",
    en: "Seeking Allah's Help (Isti'anah)",
    ar: "الاستعانة بالله",
    keywords: {
      en: ["seeking help from allah", "asking allah for help", "help from god"],
      ar: ["الاستعانة بالله", "نستعين", "اياك نستعين"],
      translit: ["istianah", "nastaeen"],
    },
  },
  {
    id: "repentance",
    en: "Repentance (Tawbah)",
    ar: "التوبة",
    keywords: {
      en: ["repentance", "turning back to god", "seeking forgiveness for sins", "asking for forgiveness"],
      ar: ["التوبة", "توبوا", "استغفروا"],
      translit: ["tawbah", "tawba", "istighfar"],
    },
  },
  {
    id: "gratitude",
    en: "Gratitude (Shukr)",
    ar: "الشكر",
    keywords: {
      en: ["gratitude", "thankfulness", "being thankful", "thanking god"],
      ar: ["الشكر", "شاكر", "اشكروا"],
      translit: ["shukr", "shukur"],
    },
  },
  {
    id: "family",
    en: "Family & Parents",
    ar: "بر الوالدين",
    keywords: {
      en: ["parents", "family", "mother", "father", "kindness to parents"],
      ar: ["الوالدين", "بر الوالدين", "الأم", "الأب"],
      translit: ["birr al-walidayn", "walidayn"],
    },
  },
  {
    id: "justice",
    en: "Justice ('Adl)",
    ar: "العدل",
    keywords: {
      en: ["justice", "fairness", "equity", "being just"],
      ar: ["العدل", "القسط", "العدالة"],
      translit: ["adl", "qist"],
    },
  },
  {
    id: "prayer",
    en: "Prayer (Salah)",
    ar: "الصلاة",
    keywords: {
      en: ["prayer", "worship rituals", "establishing prayer"],
      ar: ["الصلاة", "الصلوات", "أقيموا الصلاة"],
      translit: ["salah", "salat"],
    },
  },
  {
    id: "charity",
    en: "Charity (Zakat & Sadaqah)",
    ar: "الزكاة والصدقة",
    keywords: {
      en: ["charity", "almsgiving", "giving to the poor", "helping the needy"],
      ar: ["الزكاة", "الصدقة", "الإنفاق"],
      translit: ["zakat", "sadaqah", "sadaqa"],
    },
  },
  {
    id: "fasting",
    en: "Fasting (Sawm)",
    ar: "الصيام",
    keywords: {
      en: ["fasting", "ramadan"],
      ar: ["الصيام", "الصوم", "رمضان"],
      translit: ["sawm", "siyam"],
    },
  },
  {
    id: "forgiveness",
    en: "Forgiveness & Pardon",
    ar: "العفو والمغفرة",
    keywords: {
      en: ["forgiveness", "pardon", "mercy toward others", "forgiving people"],
      ar: ["العفو", "المغفرة", "اعفوا"],
      translit: ["afw", "maghfirah"],
    },
  },
  {
    id: "afterlife",
    en: "Day of Judgment & Afterlife",
    ar: "يوم القيامة",
    keywords: {
      en: ["day of judgment", "afterlife", "resurrection", "hereafter", "day of resurrection"],
      ar: ["يوم القيامة", "الآخرة", "البعث"],
      translit: ["qiyamah", "akhirah"],
    },
  },
  {
    id: "paradise_hell",
    en: "Paradise & Hell",
    ar: "الجنة والنار",
    keywords: {
      en: ["paradise", "heaven", "hell", "hellfire", "jannah", "jahannam"],
      ar: ["الجنة", "النار", "جهنم"],
      translit: ["jannah", "jahannam", "naar"],
    },
  },
  {
    id: "knowledge",
    en: "Knowledge ('Ilm)",
    ar: "العلم",
    keywords: {
      en: ["knowledge", "learning", "seeking knowledge", "wisdom"],
      ar: ["العلم", "العلماء", "طلب العلم"],
      translit: ["ilm", "ilim"],
    },
  },
  {
    id: "hypocrisy",
    en: "Hypocrisy (Nifaq)",
    ar: "النفاق",
    keywords: {
      en: ["hypocrisy", "hypocrites", "double-faced"],
      ar: ["النفاق", "المنافقون"],
      translit: ["nifaq", "munafiqun"],
    },
  },
  {
    id: "arrogance",
    en: "Disbelief & Arrogance",
    ar: "الكفر والكبر",
    keywords: {
      en: ["disbelief", "arrogance", "pride", "rejecting the truth"],
      ar: ["الكفر", "الكبر", "الاستكبار"],
      translit: ["kufr", "kibr"],
    },
  },
  {
    id: "marriage",
    en: "Marriage & Spouses",
    ar: "الزواج",
    keywords: {
      en: ["marriage", "spouse", "husband and wife", "wedlock"],
      ar: ["الزواج", "الأزواج", "النكاح"],
      translit: ["nikah", "zawaj"],
    },
  },
  {
    id: "orphans",
    en: "Orphans & the Vulnerable",
    ar: "اليتامى",
    keywords: {
      en: ["orphans", "the poor and needy", "vulnerable people"],
      ar: ["اليتامى", "المساكين"],
      translit: ["yatama", "yateem"],
    },
  },
  {
    id: "trials",
    en: "Trials & Hardship (Ibtila')",
    ar: "الابتلاء",
    keywords: {
      en: ["trials", "tests from god", "dealing with hardship", "affliction", "difficulty"],
      ar: ["الابتلاء", "الفتنة", "البلاء"],
      translit: ["ibtila", "bala"],
    },
  },
];

export default topics;
