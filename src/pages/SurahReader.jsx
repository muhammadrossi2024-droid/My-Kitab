import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import { reciters } from "../data/reciters.js";
import {
  downloadSurah,
  fetchSurahJson,
  hasCacheSupport,
  isSurahDownloaded,
  removeSurahDownload,
  resolveAudioSrc,
} from "../utils/offline.js";

export default function SurahReader() {
  const { number } = useParams();
  const surahNumber = parseInt(number, 10);
  const { settings, updateSettings, setLastRead } = useSettings();
  const { markRead, markListened, isRead, isListened, getSurahProgress } = useProgress();
  const [surah, setSurah] = useState(null);
  const [error, setError] = useState(null);
  const [playingVerse, setPlayingVerse] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadState, setDownloadState] = useState(null); // null | {done, total}
  const hasScrolledRef = useRef(false);
  const audioRef = useRef(null);
  const playingVerseRef = useRef(null);
  const blobUrlRef = useRef(null);
  const verseElsRef = useRef(new Map());
  const observerRef = useRef(null);

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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  function registerVerseEl(verseNumber, el) {
    if (!el) {
      verseElsRef.current.delete(verseNumber);
      return;
    }
    verseElsRef.current.set(verseNumber, el);
    if (observerRef.current) observerRef.current.observe(el);
  }

  function getAudio() {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    playingVerseRef.current = null;
    setPlayingVerse(null);
  }

  async function playFromVerse(verseNumber) {
    if (!surah) return;
    const audio = getAudio();
    playingVerseRef.current = verseNumber;
    setPlayingVerse(verseNumber);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    const src = await resolveAudioSrc(surah.number, verseNumber, settings.reciter);
    if (src.startsWith("blob:")) blobUrlRef.current = src;
    // The user may have paused/skipped while the src was resolving.
    if (playingVerseRef.current !== verseNumber) return;
    audio.src = src;

    audio.onended = () => {
      markListened(surah.number, verseNumber);
      const verses = surah.verses;
      const idx = verses.findIndex((v) => v.number === playingVerseRef.current);
      const next = idx >= 0 ? verses[idx + 1] : null;
      if (next) {
        playFromVerse(next.number);
      } else {
        stopPlayback();
      }
    };
    audio.onerror = () => stopPlayback();

    audio.play().catch(() => stopPlayback());

    const el = document.getElementById(`ayah-${verseNumber}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function togglePlaySurah() {
    if (playingVerse) {
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
    if (!surah) return;
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
            {playingVerse ? "⏸ Pause" : "▶ Play Surah"}
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
          {hasCacheSupport() ? (
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
                <button
                  className="verse-play-btn"
                  onClick={() => toggleVerse(verse.number)}
                  aria-label={playingVerse === verse.number ? "Pause verse" : "Play verse"}
                  title={playingVerse === verse.number ? "Pause" : "Play from here"}
                >
                  {playingVerse === verse.number ? "⏸" : "▶"}
                </button>
              </div>

              <div className={settings.displayMode === "both" ? "ayah-side-by-side" : undefined}>
                {settings.displayMode !== "english" && (
                  <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                    {verse.arabic}
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
