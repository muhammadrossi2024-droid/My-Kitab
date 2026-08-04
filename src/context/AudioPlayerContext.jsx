import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSettings } from "./SettingsContext.jsx";
import { useProgress } from "./ProgressContext.jsx";
import { reciters as recitersList, isFullSurahReciter, surahAudioUrl, supportsWordTiming } from "../data/reciters.js";
import { verseAudioUrl } from "../utils/audio.js";
import { getCachedAudioBlob } from "../utils/offline.js";
import { fetchChapterWordTiming, segmentsMatchWordCount, wordRangeAtTime } from "../utils/wordTiming.js";
import { getVerseWords, computeVerseBoundaries, verseAtFraction } from "../utils/quranWords.js";

const AudioPlayerContext = createContext(null);

// The actual Quran audio engine — previously lived entirely inside
// SurahReader.jsx and was torn down whenever that page unmounted. Lifted
// up to provider level (mounted once, for the app's whole lifetime) so
// playback survives navigating away to another tab, with a persistent
// mini-player (AudioMiniPlayer.jsx) reading from it from anywhere.
//
// SurahReader still owns its own `surah` fetch for display (arabic text,
// translations, verse count — needed whether or not that surah happens to
// be playing) and hands the loaded surah object to this context's
// play*() calls rather than this context re-fetching it itself. The
// context then holds onto that object as `currentSurah` for as long as
// it's relevant to playback (next-verse preloading, full-surah boundary
// estimation, mini-player title), independent of whether the page that
// started playback is still mounted.
//
// `currentTime`/`duration` are deliberately NOT React state — a tick every
// ~250ms from `timeupdate` would re-render every consumer of this context
// app-wide. Anything that needs a live scrub position (the expanded Now
// Playing view) reads `audioRef.current` directly via its own rAF loop,
// only while it's actually mounted and visible.
export function AudioPlayerProvider({ children }) {
  const { settings, updateSettings } = useSettings();
  const { markListened } = useProgress();

  const [currentSurah, setCurrentSurah] = useState(null); // the surah object last handed to play*()
  const [playingVerse, setPlayingVerse] = useState(null);
  const [activeWordRange, setActiveWordRange] = useState(null);
  const [fullSurahPlaying, setFullSurahPlaying] = useState(false);
  const [fullSurahActiveVerse, setFullSurahActiveVerse] = useState(null);

  const audioRef = useRef(null);
  const playingVerseRef = useRef(null);
  const blobUrlRef = useRef(null);
  const preloadRef = useRef(null);
  const preloadTokenRef = useRef(0);
  const chapterTimingRef = useRef(null);
  const surahRef = useRef(null); // mirrors currentSurah for use inside callbacks/closures
  // Bumped at the start of every playFromVerse/playFullSurah call. Switching
  // verses pauses the previous <audio>, which rejects ITS play() promise
  // with an AbortError — without this guard that stale rejection's .catch
  // handler would fire after the next verse is already playing and stop it.
  const playCallTokenRef = useRef(0);

  useEffect(() => {
    surahRef.current = currentSurah;
  }, [currentSurah]);

  const fullSurahMode = isFullSurahReciter(settings.reciter);
  const reciterSupportsWord = supportsWordTiming(settings.reciter);
  const effectiveFollowAlong = settings.followAlong === "word" && reciterSupportsWord ? "word" : "ayah";

  // Real per-word timing (quran.com's segment data), refetched whenever the
  // loaded surah or reciter changes — only meaningful in word-by-word mode
  // with a reciter that actually has segment data.
  useEffect(() => {
    chapterTimingRef.current = null;
    if (!currentSurah || effectiveFollowAlong !== "word") return;
    let cancelled = false;
    fetchChapterWordTiming(settings.reciter, currentSurah.number).then((map) => {
      if (!cancelled) chapterTimingRef.current = map;
    });
    return () => {
      cancelled = true;
    };
  }, [currentSurah, settings.reciter, effectiveFollowAlong]);

  function discardCurrentAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.ontimeupdate = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    audioRef.current = null;
  }

  function discardPreload() {
    if (preloadRef.current) {
      preloadRef.current.audio.pause();
      preloadRef.current.audio.src = "";
      if (preloadRef.current.blobUrl) URL.revokeObjectURL(preloadRef.current.blobUrl);
      preloadRef.current = null;
    }
    preloadTokenRef.current += 1;
  }

  function stopPlayback() {
    discardCurrentAudio();
    discardPreload();
    playingVerseRef.current = null;
    setPlayingVerse(null);
    setActiveWordRange(null);
    setFullSurahPlaying(false);
    setFullSurahActiveVerse(null);
  }

  // See the same-named function's original comment in SurahReader's
  // history — unchanged decision tree: offline cache, then real word
  // timing if applicable, then the plain everyayah.com fallback.
  async function resolveVersePlan(surah, verseNumber) {
    const verse = surah.verses.find((v) => v.number === verseNumber);
    const words = verse ? getVerseWords(verse) : [];
    const everyayahUrl = verseAudioUrl(surah.number, verseNumber, settings.reciter);

    const cachedSrc = await getCachedAudioBlob(everyayahUrl);
    if (cachedSrc) {
      return { src: cachedSrc, blobUrl: cachedSrc, segments: null };
    }

    if (effectiveFollowAlong === "word") {
      const timing = chapterTimingRef.current?.get(`${surah.number}:${verseNumber}`);
      if (timing?.url && segmentsMatchWordCount(timing.segments, words.length)) {
        return { src: timing.url, blobUrl: null, segments: timing.segments };
      }
    }

    return { src: everyayahUrl, blobUrl: null, segments: null };
  }

  function schedulePreloadNext(surah, afterVerseNumber) {
    const verses = surah.verses;
    const idx = verses.findIndex((v) => v.number === afterVerseNumber);
    const next = idx >= 0 ? verses[idx + 1] : null;
    if (!next) return;

    const token = ++preloadTokenRef.current;
    resolveVersePlan(surah, next.number).then((plan) => {
      if (preloadTokenRef.current !== token) return;
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = plan.src;
      preloadRef.current = {
        verseNumber: next.number,
        audio,
        blobUrl: plan.blobUrl,
        segments: plan.segments,
      };
    });
  }

  async function playFromVerse(surah, verseNumber) {
    const token = ++playCallTokenRef.current;
    setCurrentSurah(surah);
    playingVerseRef.current = verseNumber;
    setPlayingVerse(verseNumber);
    setActiveWordRange(null);
    setFullSurahPlaying(false);
    setFullSurahActiveVerse(null);

    let audio;
    let blobUrl = null;
    let segments = null;
    const preloaded = preloadRef.current;
    if (preloaded && preloaded.verseNumber === verseNumber) {
      audio = preloaded.audio;
      blobUrl = preloaded.blobUrl;
      segments = preloaded.segments;
      preloadRef.current = null;
    } else {
      if (preloaded) {
        preloaded.audio.pause();
        if (preloaded.blobUrl) URL.revokeObjectURL(preloaded.blobUrl);
        preloadRef.current = null;
      }
      const plan = await resolveVersePlan(surah, verseNumber);
      if (playingVerseRef.current !== verseNumber) return; // superseded while resolving
      audio = new Audio();
      audio.src = plan.src;
      blobUrl = plan.blobUrl;
      segments = plan.segments;
    }

    discardCurrentAudio();
    blobUrlRef.current = blobUrl;
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (playingVerseRef.current !== verseNumber) return;
      if (!segments) return;
      setActiveWordRange(wordRangeAtTime(segments, audio.currentTime * 1000));
    };

    audio.onended = () => {
      markListened(surah.number, verseNumber);
      const verses = surah.verses;
      const idx = verses.findIndex((v) => v.number === verseNumber);
      const next = idx >= 0 ? verses[idx + 1] : null;
      if (next) {
        playFromVerse(surah, next.number);
      } else {
        stopPlayback();
      }
    };
    audio.onerror = () => {
      if (playCallTokenRef.current !== token) return; // superseded by a newer play*() call
      stopPlayback();
    };

    audio.play().catch(() => {
      if (playCallTokenRef.current !== token) return; // superseded by a newer play*() call
      stopPlayback();
    });
    schedulePreloadNext(surah, verseNumber);
  }

  function playFullSurah(surah) {
    const token = ++playCallTokenRef.current;
    setCurrentSurah(surah);
    discardCurrentAudio();
    discardPreload();
    playingVerseRef.current = null;
    setPlayingVerse(null);
    const boundaries = computeVerseBoundaries(surah);
    const audio = new Audio();
    audio.src = surahAudioUrl(surah.number, settings.reciter);
    audioRef.current = audio;
    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      const fraction = Math.min(1, audio.currentTime / audio.duration);
      setFullSurahActiveVerse(verseAtFraction(boundaries, fraction));
    };
    audio.onended = () => {
      surah.verses.forEach((v) => markListened(surah.number, v.number));
      setFullSurahPlaying(false);
      setFullSurahActiveVerse(null);
    };
    audio.onerror = () => {
      if (playCallTokenRef.current !== token) return;
      setFullSurahPlaying(false);
    };
    audio.play().catch(() => {
      if (playCallTokenRef.current !== token) return;
      setFullSurahPlaying(false);
    });
    setFullSurahPlaying(true);
  }

  function togglePlaySurah(surah) {
    if (fullSurahMode) {
      if (fullSurahPlaying && surahRef.current?.number === surah.number) {
        stopPlayback();
      } else {
        playFullSurah(surah);
      }
    } else if (playingVerse && surahRef.current?.number === surah.number) {
      stopPlayback();
    } else if (surah.verses.length > 0) {
      playFromVerse(surah, surah.verses[0].number);
    }
  }

  function toggleVerse(surah, verseNumber) {
    if (playingVerse === verseNumber && surahRef.current?.number === surah.number) {
      stopPlayback();
    } else {
      playFromVerse(surah, verseNumber);
    }
  }

  function seekFullSurahToVerse(verseNumber) {
    const surah = surahRef.current;
    if (!surah || !audioRef.current || !audioRef.current.duration) return;
    const boundaries = computeVerseBoundaries(surah);
    const target = boundaries.find((b) => b.verseNumber === verseNumber);
    if (!target) return;
    audioRef.current.currentTime = target.start * audioRef.current.duration;
    setFullSurahActiveVerse(verseNumber);
  }

  function seek(time) {
    if (audioRef.current) audioRef.current.currentTime = time;
  }

  // Mini-player skip/rewind — same "restart vs. actually go back" split
  // second SoundCloud/Spotify use: rewind restarts the current track once
  // you're more than a few seconds into it, and only jumps to the truly
  // previous track from very near the start.
  function next() {
    const surah = surahRef.current;
    if (!surah) return;
    if (fullSurahMode) {
      if (fullSurahActiveVerse == null) return;
      const verses = surah.verses;
      const idx = verses.findIndex((v) => v.number === fullSurahActiveVerse);
      const nextVerse = idx >= 0 ? verses[idx + 1] : null;
      if (nextVerse) seekFullSurahToVerse(nextVerse.number);
    } else if (playingVerse != null) {
      const verses = surah.verses;
      const idx = verses.findIndex((v) => v.number === playingVerse);
      const nextVerse = idx >= 0 ? verses[idx + 1] : null;
      if (nextVerse) playFromVerse(surah, nextVerse.number);
    }
  }

  function previous() {
    const surah = surahRef.current;
    if (!surah) return;
    if (fullSurahMode) {
      if (fullSurahActiveVerse == null) return;
      if (audioRef.current && audioRef.current.currentTime > 3) {
        seekFullSurahToVerse(fullSurahActiveVerse);
        return;
      }
      const verses = surah.verses;
      const idx = verses.findIndex((v) => v.number === fullSurahActiveVerse);
      const prevVerse = idx > 0 ? verses[idx - 1] : null;
      if (prevVerse) seekFullSurahToVerse(prevVerse.number);
    } else if (playingVerse != null) {
      if (audioRef.current && audioRef.current.currentTime > 3) {
        playFromVerse(surah, playingVerse);
        return;
      }
      const verses = surah.verses;
      const idx = verses.findIndex((v) => v.number === playingVerse);
      const prevVerse = idx > 0 ? verses[idx - 1] : null;
      if (prevVerse) playFromVerse(surah, prevVerse.number);
    }
  }

  // Reciter is a global setting — switching it invalidates whatever's
  // currently loaded (offline plan, word-timing segments), so playback
  // stops rather than continuing under a now-stale plan.
  function changeReciter(reciterId) {
    stopPlayback();
    updateSettings({ reciter: reciterId });
  }

  const isPlaying = fullSurahMode ? fullSurahPlaying : playingVerse != null;

  const value = {
    currentSurah,
    surahNumber: currentSurah?.number ?? null,
    playingVerse,
    activeWordRange,
    fullSurahMode,
    fullSurahPlaying,
    fullSurahActiveVerse,
    isPlaying,
    effectiveFollowAlong,
    reciterName: recitersList.find((r) => r.id === settings.reciter)?.name || settings.reciter,
    audioRef,
    playFromVerse,
    playFullSurah,
    togglePlaySurah,
    toggleVerse,
    seekFullSurahToVerse,
    stopPlayback,
    seek,
    next,
    previous,
    changeReciter,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  return ctx;
}
