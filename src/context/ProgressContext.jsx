import { createContext, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "quran-app:progress";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { read: {}, listened: {} };
  } catch {
    return { read: {}, listened: {} };
  }
}

function addVerse(bucket, surah, verse) {
  const set = new Set(bucket[surah] || []);
  set.add(verse);
  return { ...bucket, [surah]: Array.from(set) };
}

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(load);

  const persist = (next) => {
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const markRead = (surah, verse) => {
    if ((progress.read[surah] || []).includes(verse)) return;
    persist({ ...progress, read: addVerse(progress.read, surah, verse) });
  };

  const markListened = (surah, verse) => {
    if ((progress.listened[surah] || []).includes(verse)) return;
    persist({ ...progress, listened: addVerse(progress.listened, surah, verse) });
  };

  const isRead = (surah, verse) => (progress.read[surah] || []).includes(verse);
  const isListened = (surah, verse) => (progress.listened[surah] || []).includes(verse);

  const getSurahProgress = (surah, totalVerses) => {
    const readCount = (progress.read[surah] || []).length;
    const listenedCount = (progress.listened[surah] || []).length;
    return {
      readCount,
      listenedCount,
      totalVerses,
      readPct: totalVerses ? Math.round((readCount / totalVerses) * 100) : 0,
      listenedPct: totalVerses ? Math.round((listenedCount / totalVerses) * 100) : 0,
    };
  };

  const getOverallProgress = (surahIndex) => {
    let totalVerses = 0;
    let readVerses = 0;
    let listenedVerses = 0;
    for (const s of surahIndex) {
      totalVerses += s.verseCount;
      readVerses += Math.min((progress.read[s.number] || []).length, s.verseCount);
      listenedVerses += Math.min((progress.listened[s.number] || []).length, s.verseCount);
    }
    return {
      totalVerses,
      readVerses,
      listenedVerses,
      readPct: totalVerses ? Math.round((readVerses / totalVerses) * 100) : 0,
      listenedPct: totalVerses ? Math.round((listenedVerses / totalVerses) * 100) : 0,
    };
  };

  const value = useMemo(
    () => ({ markRead, markListened, isRead, isListened, getSurahProgress, getOverallProgress }),
    [progress]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
