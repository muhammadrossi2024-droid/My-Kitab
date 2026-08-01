import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import { reciters, isFullSurahReciter, surahAudioUrl } from "../data/reciters.js";
import {
  downloadSurah,
  fetchSurahJson,
  hasCacheSupport,
  isSurahDownloaded,
  removeSurahDownload,
  resolveAudioSrc,
} from "../utils/offline.js";

// Splits an ayah's Arabic text into its words for word-by-word highlighting.
function getVerseWords(verse) {
  return verse.arabic.split(/\s+/).filter(Boolean);
}

// No source provides real per-word timestamps for any of these reciters, so
// each word's on-screen "speaking window" is estimated as proportional to
// its character length within the ayah's actual playback position (real
// currentTime/duration from the <audio> element, not a fixed timer). This
// tracks along with playback but isn't frame-accurate — long madd
// (elongation) syllables in particular will drift slightly.
function wordIndexForFraction(words, fraction) {
  if (words.length === 0) return null;
  const totalLen = words.reduce((sum, w) => sum + (w.length || 1), 0);
  let cumulative = 0;
  for (let i = 0; i < words.length; i++) {
    cumulative += words[i].length || 1;
    if (fraction <= cumulative / totalLen) return i;
  }
  return words.length - 1;
}

export default function SurahReader() {
  const { number } = useParams();
  const surahNumber = parseInt(number, 10);
  const { settings, updateSettings, setLastRead } = useSettings();
  const { markRead, markListened, isRead, isListened, getSurahProgress } = useProgress();
  const [surah, setSurah] = useState(null);
  const [error, setError] = useState(null);
  const [playingVerse, setPlayingVerse] = useState(null);
  const [activeWordIndex, setActiveWordIndex] = useState(null);
  const [fullSurahPlaying, setFullSurahPlaying] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadState, setDownloadState] = useState(null); // null | {done, total}
  const hasScrolledRef = useRef(false);
  const audioRef = useRef(null);
  const playingVerseRef = useRef(null);
  const blobUrlRef = useRef(null);
  const preloadRef = useRef(null); // { verseNumber, audio, blobUrl } | null — the next verse, buffering ahead
  const preloadTokenRef = useRef(0);
  const verseElsRef = useRef(new Map());
  const observerRef = useRef(null);

  const fullSurahMode = isFullSurahReciter(settings.reciter);

  useEffect(() => {
    setSurah(null);
    setError(null);
    hasScrolledRef.current = false;
    verseElsRef.current = new Map();
    stopPlayback();
    fetchSurahJson(surahNumber).then(setSurah).catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNumber]);

  // Re-check the offline-download badge whenever the surah or the selected
  // reciter changes, since each reciter's audio is cached separately.
  useEffect(() => {
    setDownloaded(isSurahDownloaded(surahNumber, settings.reciter));
  }, [surahNumber, settings.reciter]);

  useEffect(() => {
    if (!surah || hasScrolledRef.current) return;
    const hash = window.location.hash;
    if (hash.startsWith("#ayah-")) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        hasScrolledRef.current = true;
      }
    }
  }, [surah]);

  // Mark a verse "read" once its block has been visibly scrolled into view.
  useEffect(() => {
    if (!surah) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const verseNumber = Number(entry.target.dataset.verse);
            markRead(surah.number, verseNumber);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.5 }
    );
    observerRef.current = observer;
    for (const el of verseElsRef.current.values()) observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah]);

  // Stop and unhook audio when leaving the page entirely.
  useEffect(() => {
    return () => {
      discardCurrentAudio();
      discardPreload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function registerVerseEl(verseNumber, el) {
    if (!el) {
      verseElsRef.current.delete(verseNumber);
      return;
    }
    verseElsRef.current.set(verseNumber, el);
    if (observerRef.current) observerRef.current.observe(el);
  }

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
    setActiveWordIndex(null);
    setFullSurahPlaying(false);
  }

  // Starts buffering the verse after `afterVerseNumber` in the background so
  // it can start playing the instant the current verse ends, instead of
  // waiting for onended to fire before even beginning the network fetch.
  function schedulePreloadNext(afterVerseNumber) {
    if (!surah) return;
    const verses = surah.verses;
    const idx = verses.findIndex((v) => v.number === afterVerseNumber);
    const next = idx >= 0 ? verses[idx + 1] : null;
    if (!next) return;

    const token = ++preloadTokenRef.current;
    resolveAudioSrc(surah.number, next.number, settings.reciter).then((src) => {
      if (preloadTokenRef.current !== token) return; // superseded — user jumped elsewhere
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = src;
      preloadRef.current = {
        verseNumber: next.number,
        audio,
        blobUrl: src.startsWith("blob:") ? src : null,
      };
    });
  }

  async function playFromVerse(verseNumber) {
    if (!surah) return;
    playingVerseRef.current = verseNumber;
    setPlayingVerse(verseNumber);
    setActiveWordIndex(null);

    let audio;
    let blobUrl = null;
    const preloaded = preloadRef.current;
    if (preloaded && preloaded.verseNumber === verseNumber) {
      audio = preloaded.audio;
      blobUrl = preloaded.blobUrl;
      preloadRef.current = null;
    } else {
      if (preloaded) {
        preloaded.audio.pause();
        if (preloaded.blobUrl) URL.revokeObjectURL(preloaded.blobUrl);
        preloadRef.current = null;
      }
      const src = await resolveAudioSrc(surah.number, verseNumber, settings.reciter);
      // The user may have paused/skipped while the src was resolving.
      if (playingVerseRef.current !== verseNumber) return;
      audio = new Audio();
      audio.src = src;
      blobUrl = src.startsWith("blob:") ? src : null;
    }

    discardCurrentAudio();
    blobUrlRef.current = blobUrl;
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (playingVerseRef.current !== verseNumber || !audio.duration) return;
      const verse = surah.verses.find((v) => v.number === verseNumber);
      if (!verse) return;
      const fraction = Math.min(1, audio.currentTime / audio.duration);
      setActiveWordIndex(wordIndexForFraction(getVerseWords(verse), fraction));
    };

    audio.onended = () => {
      markListened(surah.number, verseNumber);
      const verses = surah.verses;
      const idx = verses.findIndex((v) => v.number === verseNumber);
      const next = idx >= 0 ? verses[idx + 1] : null;
      if (next) {
        playFromVerse(next.number);
      } else {
        stopPlayback();
      }
    };
    audio.onerror = () => stopPlayback();

    audio.play().catch(() => stopPlayback());
    schedulePreloadNext(verseNumber);

    const el = document.getElementById(`ayah-${verseNumber}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function playFullSurah() {
    if (!surah) return;
    discardCurrentAudio();
    discardPreload();
    const audio = new Audio();
    audio.src = surahAudioUrl(surah.number, settings.reciter);
    audioRef.current = audio;
    audio.onended = () => {
      surah.verses.forEach((v) => markListened(surah.number, v.number));
      setFullSurahPlaying(false);
    };
    audio.onerror = () => setFullSurahPlaying(false);
    audio.play().catch(() => setFullSurahPlaying(false));
    setFullSurahPlaying(true);
  }

  function togglePlaySurah() {
    if (fullSurahMode) {
      if (fullSurahPlaying) {
        stopPlayback();
      } else {
        playFullSurah();
      }
    } else if (playingVerse) {
      stopPlayback();
    } else if (surah && surah.verses.length > 0) {
      playFromVerse(surah.verses[0].number);
    }
  }

  function toggleVerse(verseNumber) {
    if (playingVerse === verseNumber) {
      stopPlayback();
    } else {
      playFromVerse(verseNumber);
    }
  }

  async function handleDownloadToggle() {
    if (!surah || fullSurahMode) return;
    if (downloaded) {
      await removeSurahDownload(surah, settings.reciter);
      setDownloaded(false);
      return;
    }
    setDownloadState({ done: 0, total: surah.verses.length + 1 });
    try {
      await downloadSurah(surah, (done, total) => setDownloadState({ done, total }), settings.reciter);
      setDownloaded(true);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadState(null);
    }
  }

  function handleReciterChange(reciterId) {
    stopPlayback();
    updateSettings({ reciter: reciterId });
  }

  if (error) {
    return (
      <div className="empty-state">
        This surah hasn't been scraped yet. Run <code>npm run scrape -- --only={surahNumber}</code>{" "}
        then reload.
      </div>
    );
  }

  if (!surah) {
    return <div className="loading-state">Loading surah…</div>;
  }

  const prevNumber = surahNumber > 1 ? surahNumber - 1 : null;
  const nextNumber = surahNumber < 114 ? surahNumber + 1 : null;
  const progress = getSurahProgress(surah.number, surah.totalVerses);
  const isPlaying = fullSurahMode ? fullSurahPlaying : Boolean(playingVerse);

  return (
    <div>
      <div className="reader-header">
        <div className="surah-arabic-name" style={{ fontSize: "2rem" }}>
          {surah.name.arabic}
        </div>
        <h1 style={{ margin: "8px 0 4px" }}>{surah.name.transliteration}</h1>
        <div style={{ color: "var(--text-muted)" }}>
          {surah.name.englishMeaning} · {surah.revelationType} · {surah.totalVerses} verses
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={togglePlaySurah}>
            {isPlaying ? "⏸ Pause" : "▶ Play Surah"}
          </button>
          <select
            className="select-input"
            value={settings.reciter}
            onChange={(e) => handleReciterChange(e.target.value)}
            aria-label="Reciter"
            title="Reciter"
          >
            {reciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {fullSurahMode ? (
            <span
              className="btn"
              style={{ opacity: 0.6, cursor: "default" }}
              title="This reciter only has one continuous file per surah, so per-verse offline download isn't available"
            >
              ⬇ Not available for this reciter
            </span>
          ) : hasCacheSupport() ? (
            <button
              className={"btn download-btn" + (downloaded ? " downloaded" : "")}
              onClick={handleDownloadToggle}
              disabled={Boolean(downloadState)}
            >
              {downloadState
                ? `Downloading… ${downloadState.done}/${downloadState.total}`
                : downloaded
                ? "✓ Downloaded (tap to remove)"
                : "⬇ Download for Offline"}
            </button>
          ) : (
            <span
              className="btn"
              style={{ opacity: 0.6, cursor: "default" }}
              title="Offline download needs a secure connection (https://, or localhost on this device)"
            >
              ⬇ Offline unavailable here
            </span>
          )}
        </div>
        {fullSurahMode && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 10 }}>
            This reciter is only available as one continuous recording per surah — no per-verse
            play, word highlighting, or offline download.
          </p>
        )}

        <div style={{ maxWidth: 320, margin: "16px auto 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 4 }}>
            <span>Read {progress.readCount}/{progress.totalVerses}</span>
            <span>Listened {progress.listenedCount}/{progress.totalVerses}</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress.readPct}%` }} />
          </div>
        </div>
      </div>

      <div className="card">
        {surah.verses.map((verse) => {
          const read = isRead(surah.number, verse.number);
          const listened = isListened(surah.number, verse.number);
          const words = getVerseWords(verse);
          return (
            <div
              className={"ayah-block" + (playingVerse === verse.number ? " ayah-playing" : "")}
              id={`ayah-${verse.number}`}
              data-verse={verse.number}
              key={verse.number}
              ref={(el) => registerVerseEl(verse.number, el)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="ayah-number-badge">
                  {surah.number}:{verse.number}
                  {read && <span className="read-dot read-dot-read" title="Read" />}
                  {listened && <span className="read-dot read-dot-listened" title="Listened" />}
                </span>
                {!fullSurahMode && (
                  <button
                    className="verse-play-btn"
                    onClick={() => toggleVerse(verse.number)}
                    aria-label={playingVerse === verse.number ? "Pause verse" : "Play verse"}
                    title={playingVerse === verse.number ? "Pause" : "Play from here"}
                  >
                    {playingVerse === verse.number ? "⏸" : "▶"}
                  </button>
                )}
              </div>

              <div className={settings.displayMode === "both" ? "ayah-side-by-side" : undefined}>
                {settings.displayMode !== "english" && (
                  <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                    {words.map((word, i) => (
                      <span
                        key={i}
                        className={
                          "ayah-word" +
                          (playingVerse === verse.number && activeWordIndex === i
                            ? " ayah-word-active"
                            : "")
                        }
                      >
                        {word}
                        {i < words.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </p>
                )}
                {settings.displayMode !== "arabic" && (
                  <p
                    className="ayah-translation"
                    style={{ fontSize: settings.translationFontSize }}
                  >
                    {verse.translation}
                  </p>
                )}
              </div>

              <button
                className="btn"
                style={{ marginTop: 8, fontSize: "0.8rem", padding: "4px 10px" }}
                onClick={() => setLastRead(surah.number, verse.number)}
              >
                Mark as last read
              </button>
            </div>
          );
        })}
      </div>

      <div className="reader-nav">
        {prevNumber ? (
          <Link className="btn" to={`/surah/${prevNumber}`}>
            ← Previous Surah
          </Link>
        ) : (
          <span />
        )}
        {nextNumber ? (
          <Link className="btn" to={`/surah/${nextNumber}`}>
            Next Surah →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
