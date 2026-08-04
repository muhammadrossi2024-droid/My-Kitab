import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import { useAudioPlayer } from "../context/AudioPlayerContext.jsx";
import { usePremium } from "../context/PremiumContext.jsx";
import BackToTopButton from "../components/BackToTopButton.jsx";
import ArabicText from "../components/ArabicText.jsx";
import FlipNoteCard from "../components/FlipNoteCard.jsx";
import { listNotesBySourceKey } from "../utils/notesDb.js";
import { getVerseWords } from "../utils/quranWords.js";
import { reciters, supportsWordTiming, getReciter } from "../data/reciters.js";
import { downloadSurah, fetchSurahJson, hasCacheSupport, isSurahDownloaded, removeSurahDownload } from "../utils/offline.js";

export default function SurahReader() {
  const { number } = useParams();
  const surahNumber = parseInt(number, 10);
  const { settings, updateSettings, setLastRead } = useSettings();
  const { markRead, isRead, isListened, getSurahProgress } = useProgress();
  const audioPlayer = useAudioPlayer();
  const { isPremiumUser, openPremiumOffer } = usePremium();
  const [surah, setSurah] = useState(null);
  const [error, setError] = useState(null);
  const [notesByRef, setNotesByRef] = useState(new Map());
  const [downloaded, setDownloaded] = useState(false);
  const [downloadState, setDownloadState] = useState(null); // null | {done, total}
  const [ayahPickerOpen, setAyahPickerOpen] = useState(false);
  const [ayahPickerScrolled, setAyahPickerScrolled] = useState(false);
  const ayahPickerScrollRef = useRef(null);
  const [justMarkedVerse, setJustMarkedVerse] = useState(null);
  const markedTimeoutRef = useRef(null);
  const hasScrolledRef = useRef(false);
  const verseElsRef = useRef(new Map());
  const observerRef = useRef(null);

  // Playback is app-global (see AudioPlayerContext) — these "my..." values
  // are only non-null/true when THIS surah is the one actually loaded for
  // playback, so a different surah playing in the background (or nothing
  // playing at all) correctly shows no highlighting here.
  const isMySurahPlaying = audioPlayer.surahNumber === surahNumber;
  const playingVerse = isMySurahPlaying ? audioPlayer.playingVerse : null;
  const activeWordRange = isMySurahPlaying ? audioPlayer.activeWordRange : null;
  const fullSurahPlaying = isMySurahPlaying ? audioPlayer.fullSurahPlaying : false;
  const fullSurahActiveVerse = isMySurahPlaying ? audioPlayer.fullSurahActiveVerse : null;
  const fullSurahMode = audioPlayer.fullSurahMode;
  const effectiveFollowAlong = audioPlayer.effectiveFollowAlong;
  const reciterSupportsWord = supportsWordTiming(settings.reciter);
  const wordModeUnavailable = settings.followAlong === "word" && !reciterSupportsWord;

  useEffect(() => {
    setSurah(null);
    setError(null);
    setAyahPickerOpen(false);
    hasScrolledRef.current = false;
    verseElsRef.current = new Map();
    // Deliberately no stopPlayback() here — navigating to a different
    // surah's reader page is no different from navigating to any other
    // tab now; whatever's already playing (this surah or another one)
    // keeps going, same as the persistent mini-player everywhere else.
    fetchSurahJson(surahNumber).then(setSurah).catch((err) => setError(err.message));
    listNotesBySourceKey("quran", surahNumber).then(setNotesByRef);
  }, [surahNumber]);

  // Optimistic local update after a note is saved/deleted from a flip
  // card — avoids re-querying IndexedDB for the whole surah on every save.
  function handleNoteChange(refKey, note, deletedId) {
    setNotesByRef((prev) => {
      const next = new Map(prev);
      if (deletedId) next.delete(refKey);
      else next.set(refKey, note);
      return next;
    });
  }

  // Re-check the offline-download badge whenever the surah or the selected
  // reciter changes, since each reciter's audio is cached separately.
  useEffect(() => {
    setDownloaded(isSurahDownloaded(surahNumber, settings.reciter));
  }, [surahNumber, settings.reciter]);

  // Scrolls to the verse that just started playing — covers both the user
  // pressing play on this page and playback auto-advancing to the next
  // verse while this page happens to be the one mounted.
  useEffect(() => {
    if (!isMySurahPlaying || fullSurahMode || playingVerse == null) return;
    const el = document.getElementById(`ayah-${playingVerse}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isMySurahPlaying, fullSurahMode, playingVerse]);

  // Full-surah mode has no per-verse play call to hang a scroll off of, so
  // scroll here instead, whenever the estimated "currently playing" ayah
  // moves to a new verse.
  useEffect(() => {
    if (!isMySurahPlaying || !fullSurahMode || fullSurahActiveVerse == null) return;
    const el = document.getElementById(`ayah-${fullSurahActiveVerse}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isMySurahPlaying, fullSurahMode, fullSurahActiveVerse]);

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

  useEffect(() => {
    return () => {
      if (markedTimeoutRef.current) clearTimeout(markedTimeoutRef.current);
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

  function togglePlaySurah() {
    audioPlayer.togglePlaySurah(surah);
  }

  function toggleVerse(verseNumber) {
    audioPlayer.toggleVerse(surah, verseNumber);
  }

  function handleJumpToAyah(verseNumber) {
    setAyahPickerOpen(false);
    const audioActive = isMySurahPlaying && (fullSurahMode ? fullSurahPlaying : Boolean(playingVerse));
    if (audioActive) {
      if (fullSurahMode) {
        audioPlayer.seekFullSurahToVerse(verseNumber);
      } else {
        audioPlayer.playFromVerse(surah, verseNumber);
      }
    }
    if (!audioActive || fullSurahMode) {
      const el = document.getElementById(`ayah-${verseNumber}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function handleMarkLastRead(verseNumber) {
    setLastRead(surah.number, verseNumber);
    setJustMarkedVerse(verseNumber);
    if (markedTimeoutRef.current) clearTimeout(markedTimeoutRef.current);
    markedTimeoutRef.current = setTimeout(() => setJustMarkedVerse(null), 2000);
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
    audioPlayer.changeReciter(reciterId);
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
    <div className="surah-reader">
      <div className="reader-header">
        <div className="surah-arabic-name" style={{ fontSize: "2rem" }}>
          {surah.name.arabic}
        </div>
        <h1 style={{ margin: "8px 0 4px" }}>{surah.name.transliteration}</h1>
        <div style={{ color: "var(--text-muted)" }}>
          {surah.name.englishMeaning} · {surah.revelationType} ·{" "}
          <span className="ayah-picker-wrap">
            <button
              className="ayah-picker-trigger"
              onClick={() => {
                setAyahPickerScrolled(false);
                setAyahPickerOpen((v) => !v);
              }}
              aria-haspopup="true"
              aria-expanded={ayahPickerOpen}
            >
              {surah.totalVerses} verses ▾
            </button>
            {ayahPickerOpen && (
              <>
                <div className="ayah-picker-backdrop" onClick={() => setAyahPickerOpen(false)} />
                <div className="ayah-picker-popover" role="dialog" aria-label="Jump to ayah">
                  <div className="ayah-picker-header">
                    <span>Jump to Ayah</span>
                    <button
                      className="ayah-picker-close"
                      onClick={() => setAyahPickerOpen(false)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div
                    className="ayah-picker-scroll"
                    ref={ayahPickerScrollRef}
                    onScroll={(e) => setAyahPickerScrolled(e.currentTarget.scrollTop > 160)}
                  >
                    <div className="ayah-picker-grid">
                      {Array.from({ length: surah.totalVerses }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          className={
                            "ayah-picker-item" +
                            ((fullSurahMode ? fullSurahActiveVerse : playingVerse) === n
                              ? " active"
                              : "")
                          }
                          onClick={() => handleJumpToAyah(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {ayahPickerScrolled && (
                    <button
                      className="ayah-picker-top-btn"
                      onClick={() =>
                        ayahPickerScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
                      }
                      aria-label="Back to top"
                    >
                      ↑ Top
                    </button>
                  )}
                </div>
              </>
            )}
          </span>
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

        <div className="theme-toggle-group" style={{ justifyContent: "center", marginTop: 10 }}>
          <button
            className={"theme-toggle-btn" + (settings.followAlong === "word" ? " active" : "")}
            onClick={() => updateSettings({ followAlong: "word" })}
          >
            Word-by-word
          </button>
          <button
            className={"theme-toggle-btn" + (settings.followAlong === "ayah" ? " active" : "")}
            onClick={() => updateSettings({ followAlong: "ayah" })}
          >
            Ayah-by-ayah
          </button>
        </div>
        {fullSurahMode && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 10 }}>
            This reciter is only available as one continuous recording per surah — no per-verse
            play or offline download. The currently-playing ayah is still tracked and highlighted,
            estimated from its position in the recording rather than word-level timing.
          </p>
        )}
        {wordModeUnavailable && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 10 }}>
            {getReciter(settings.reciter).name} doesn't have word-level timing data — showing
            ayah-by-ayah tracking instead.
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
          const isThisVersePlaying = fullSurahMode
            ? fullSurahActiveVerse === verse.number
            : playingVerse === verse.number;
          const refKey = `${surah.number}:${verse.number}`;
          return (
            <div
              className={
                "ayah-block" +
                (isThisVersePlaying ? " ayah-playing" : "") +
                (isThisVersePlaying && effectiveFollowAlong === "ayah" ? " ayah-follow-ayah" : "")
              }
              id={`ayah-${verse.number}`}
              data-verse={verse.number}
              key={verse.number}
              ref={(el) => registerVerseEl(verse.number, el)}
            >
              <FlipNoteCard
                source="quran"
                sourceKey={surah.number}
                refKey={refKey}
                sourceLabel={`${surah.name.transliteration} ${surah.number}:${verse.number}`}
                excerpt={verse.translation}
                existing={notesByRef.get(refKey)}
                onNoteChange={(note, deletedId) => handleNoteChange(refKey, note, deletedId)}
                locked={!isPremiumUser}
                onLockedTap={() => openPremiumOffer()}
                front={
                  <>
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
                          aria-label={isThisVersePlaying ? "Pause verse" : "Play verse"}
                          title={isThisVersePlaying ? "Pause" : "Play from here"}
                        >
                          {isThisVersePlaying ? "⏸" : "▶"}
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
                                (isThisVersePlaying &&
                                activeWordRange &&
                                i >= activeWordRange.start &&
                                i < activeWordRange.end
                                  ? " ayah-word-active"
                                  : "")
                              }
                            >
                              <ArabicText text={word} />
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
                      className={
                        "btn mark-last-read-btn" +
                        (justMarkedVerse === verse.number ? " marked" : "")
                      }
                      style={{ marginTop: 8, fontSize: "0.8rem", padding: "6px 12px" }}
                      onClick={() => handleMarkLastRead(verse.number)}
                    >
                      {justMarkedVerse === verse.number ? "✓ Marked" : "🔖 Mark as last read"}
                    </button>
                  </>
                }
              />
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

      <BackToTopButton />
    </div>
  );
}
