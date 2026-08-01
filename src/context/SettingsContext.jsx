import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_RECITER_ID, reciters } from "../data/reciters.js";

const STORAGE_KEY = "quran-app:settings";
const LAST_READ_KEY = "quran-app:last-read";

const DEFAULT_SETTINGS = {
  theme: "light", // "light" | "dark"
  arabicFontSize: 32,
  translationFontSize: 17,
  displayMode: "both", // "both" | "arabic" | "english"
  reciter: DEFAULT_RECITER_ID,
  // The default reciter (Al-Minshawi) supports word-level timing, so "word"
  // is the sensible starting preference. This is a stored preference, not a
  // computed value — switching to a reciter without word data doesn't
  // overwrite it, playback just falls back to ayah-level for that reciter.
  followAlong: "word", // "word" | "ayah"
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw);
    // Migrate the old boolean showTranslation setting to displayMode.
    if (saved.displayMode === undefined && saved.showTranslation !== undefined) {
      saved.displayMode = saved.showTranslation ? "both" : "arabic";
      delete saved.showTranslation;
    }
    // Fall back to the default reciter if a previously-saved choice has
    // since been removed from the roster (e.g. a discontinued reciter).
    if (saved.reciter && !reciters.some((r) => r.id === saved.reciter)) {
      saved.reciter = DEFAULT_RECITER_ID;
    }
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadLastRead() {
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);
  const [lastRead, setLastReadState] = useState(loadLastRead);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  const updateSettings = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  const setLastRead = (surahNumber, ayahNumber) => {
    const value = { surah: surahNumber, ayah: ayahNumber, at: new Date().toISOString() };
    setLastReadState(value);
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(value));
  };

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings, lastRead, setLastRead }),
    [settings, lastRead]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
