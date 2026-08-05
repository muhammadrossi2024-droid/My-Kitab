import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play, Pause, Bookmark, BookOpen } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAudioPlayer } from "../context/AudioPlayerContext.jsx";
import { usePremium } from "../context/PremiumContext.jsx";
import QuranViewToggle from "../components/QuranViewToggle.jsx";
import ArabicText from "../components/ArabicText.jsx";
import FlipNoteCard from "../components/FlipNoteCard.jsx";
import { listNotesBySourceKey } from "../utils/notesDb.js";
import { fetchSurahJson } from "../utils/offline.js";
import { supportsWordTiming } from "../data/reciters.js";
import ReciterSelect from "../components/ReciterSelect.jsx";
import { surahMeta } from "../data/surahMeta.js";
import {
  TOTAL_MUSHAF_PAGES,
  fetchMushafPage,
  prefetchAdjacentPages,
  pageForAyah,
  pageForSurah,
  pageForJuz,
} from "../utils/mushaf.js";

const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
const JUZ_NAMES = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر",
  "الثامن عشر", "التاسع عشر", "العشرون", "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون",
  "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون",
  "التاسع والعشرون", "الثلاثون",
];

function surahByNumber(n) {
  return surahMeta.find((s) => s.number === n);
}

// Splits one line's flat word list into runs of consecutive words that
// belong to the same ayah — each run becomes its own tappable note target,
// so a long ayah that wraps across several lines still opens the same note
// from any line it appears on.
function groupWordsByVerse(words) {
  const runs = [];
  for (const w of words) {
    const last = runs[runs.length - 1];
    if (last && last.verseKey === w.v) last.words.push(w);
    else runs.push({ verseKey: w.v, words: [w] });
  }
  return runs;
}

export default function MushafPage() {
  const { pageNumber: pageNumberParam } = useParams();
  const pageNumber = Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, parseInt(pageNumberParam, 10) || 1));
  const navigate = useNavigate();
  const { settings, updateSettings, setLastRead } = useSettings();
  const { isPremiumUser, openPremiumOffer } = usePremium();
  const audioPlayer = useAudioPlayer();

  const [pageData, setPageData] = useState(null);
  const [error, setError] = useState(null);
  const [notesByRef, setNotesByRef] = useState(new Map());
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState("");
  const [primaryVerse, setPrimaryVerse] = useState(null); // {surah, ayah} — last ayah the user interacted with on this page
  const [justMarkedVerse, setJustMarkedVerse] = useState(null); // "surah:ayah" string, briefly shown after marking last read

  const surahJsonCacheRef = useRef(new Map()); // surahNumber -> loaded surah JSON (for audio playback)
  const touchStartXRef = useRef(null);
  const markedTimeoutRef = useRef(null);
  const followedVerseRef = useRef(null); // last verse we auto-followed playback to, so we don't re-navigate every render

  const reciterSupportsWord = supportsWordTiming(settings.reciter);
  const wordModeUnavailable = settings.followAlong === "word" && !reciterSupportsWord;

  // Load this page's data, and warm the cache for its neighbors so
  // next/previous almost always resolves instantly (see utils/mushaf.js).
  useEffect(() => {
    let cancelled = false;
    setPageData(null);
    setError(null);
    setPrimaryVerse(null);
    fetchMushafPage(pageNumber)
      .then((data) => {
        if (!cancelled) setPageData(data);
      })
      .catch((err) => !cancelled && setError(err.message));
    prefetchAdjacentPages(pageNumber);
    return () => {
      cancelled = true;
    };
  }, [pageNumber]);

  // Every surah that appears anywhere on this page — usually one, sometimes
  // two or three where short surahs share a page near the end of the Quran.
  const surahNumbersOnPage = useMemo(() => {
    if (!pageData) return [];
    const set = new Set();
    for (const item of pageData.items) {
      if (item.type === "surah-header") set.add(item.surah);
      if (item.type === "line") for (const w of item.words) set.add(parseInt(w.v.split(":")[0], 10));
    }
    return Array.from(set);
  }, [pageData]);

  // Pre-groups each line's words into per-ayah runs, and — critically —
  // stamps each real word with its index within the *whole ayah* (not just
  // within this line). A long ayah wraps across several lines/runs, but
  // AudioPlayerContext's activeWordRange is a single {start,end} pair over
  // the ayah's full word count (see utils/quranWords.js), so highlighting
  // needs one running counter per verseKey spanning every line it appears
  // on — computed once here rather than restarting at 0 on each line.
  const pageRuns = useMemo(() => {
    if (!pageData) return null;
    const verseWordCounters = new Map();
    return pageData.items.map((item) => {
      if (item.type !== "line") return item;
      const runs = groupWordsByVerse(item.words).map((run) => ({
        verseKey: run.verseKey,
        words: run.words.map((w) => {
          if (w.end) return w;
          const idx = verseWordCounters.get(run.verseKey) ?? 0;
          verseWordCounters.set(run.verseKey, idx + 1);
          return { ...w, wordIndex: idx };
        }),
      }));
      return { ...item, runs };
    });
  }, [pageData]);

  // Notes are stored per-surah (same as SurahReader) — merge every surah on
  // this page into one lookup keyed by "surah:ayah".
  useEffect(() => {
    if (surahNumbersOnPage.length === 0) return;
    let cancelled = false;
    Promise.all(surahNumbersOnPage.map((n) => listNotesBySourceKey("quran", n))).then((maps) => {
      if (cancelled) return;
      const merged = new Map();
      for (const m of maps) for (const [k, v] of m) merged.set(k, v);
      setNotesByRef(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [surahNumbersOnPage]);

  // Surah JSON (Arabic + verse list) for every surah on this page — needed
  // to hand off to AudioPlayerContext's playFromVerse/toggleVerse, which
  // expects the same surah-object shape SurahReader gives it.
  useEffect(() => {
    for (const n of surahNumbersOnPage) {
      if (!surahJsonCacheRef.current.has(n)) {
        fetchSurahJson(n)
          .then((surah) => surahJsonCacheRef.current.set(n, surah))
          .catch(() => {});
      }
    }
  }, [surahNumbersOnPage]);

  useEffect(() => {
    return () => {
      if (markedTimeoutRef.current) clearTimeout(markedTimeoutRef.current);
    };
  }, []);

  const isMySurahPlaying = (surahNum) => audioPlayer.surahNumber === surahNum;
  const fullSurahMode = audioPlayer.fullSurahMode;

  // Follows recitation across page boundaries the same way SurahReader
  // scrolls to the playing ayah — here that means navigating to whichever
  // page the currently-playing ayah lives on, if it isn't this one.
  useEffect(() => {
    const verseNumber = fullSurahMode ? audioPlayer.fullSurahActiveVerse : audioPlayer.playingVerse;
    const surahNum = audioPlayer.surahNumber;
    if (verseNumber == null || surahNum == null) return;
    const key = `${surahNum}:${verseNumber}`;
    if (followedVerseRef.current === key) return;
    followedVerseRef.current = key;
    pageForAyah(surahNum, verseNumber).then((page) => {
      if (page && page !== pageNumber) navigate(`/quran/page/${page}`, { replace: true });
    });
  }, [audioPlayer.playingVerse, audioPlayer.fullSurahActiveVerse, audioPlayer.surahNumber, fullSurahMode, pageNumber, navigate]);

  function goToPage(n) {
    const clamped = Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, n));
    navigate(`/quran/page/${clamped}`);
  }

  function handleNoteChange(refKey, note, deletedId) {
    setNotesByRef((prev) => {
      const next = new Map(prev);
      if (deletedId) next.delete(refKey);
      else next.set(refKey, note);
      return next;
    });
  }

  function handleModeSelect(mode) {
    if (mode === "scroll") {
      const target = primaryVerse ?? firstVerseOnPage();
      updateSettings({ quranViewMode: "scroll" });
      if (target) navigate(`/surah/${target.surah}#ayah-${target.ayah}`);
      return;
    }
    updateSettings({ quranViewMode: "page" });
  }

  function firstVerseOnPage() {
    if (!pageData) return null;
    for (const item of pageData.items) {
      if (item.type === "line" && item.words.length > 0) {
        const [surah, ayah] = item.words[0].v.split(":").map(Number);
        return { surah, ayah };
      }
    }
    return null;
  }

  function handleMarkLastRead(surahNum, ayahNum) {
    setPrimaryVerse({ surah: surahNum, ayah: ayahNum });
    setLastRead(surahNum, ayahNum);
    setJustMarkedVerse(`${surahNum}:${ayahNum}`);
    if (markedTimeoutRef.current) clearTimeout(markedTimeoutRef.current);
    markedTimeoutRef.current = setTimeout(() => setJustMarkedVerse(null), 2000);
  }

  function toggleAyahPlay(surahNum, ayahNum) {
    const surah = surahJsonCacheRef.current.get(surahNum);
    if (!surah) return;
    setPrimaryVerse({ surah: surahNum, ayah: ayahNum });
    audioPlayer.toggleVerse(surah, ayahNum);
  }

  function submitJumpToPage(e) {
    e.preventDefault();
    const n = parseInt(jumpPageInput, 10);
    if (n) goToPage(n);
    setJumpOpen(false);
    setJumpPageInput("");
  }

  function handleTouchStart(e) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartXRef.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 60) return;
    // Right-to-left reading: swiping left (finger moving toward the start
    // of the next page, same direction the script itself flows) advances;
    // swiping right goes back — the same motion as turning pages in the
    // physical Mushaf.
    if (delta < 0) goToPage(pageNumber + 1);
    else goToPage(pageNumber - 1);
  }

  if (error) {
    return <div className="empty-state">Couldn't load this Mushaf page. {error}</div>;
  }

  return (
    <div className="mushaf-reader">
      <div className="reader-header">
        <QuranViewToggle mode="page" onSelect={handleModeSelect} />

        <div className="mushaf-controls">
          <button className="btn" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1} aria-label="Previous page">
            <ChevronLeft size={16} /> Previous
          </button>

          <span className="mushaf-jump-wrap">
            <button className="ayah-picker-trigger" onClick={() => setJumpOpen((v) => !v)}>
              Page {pageNumber} ▾
            </button>
            {jumpOpen && (
              <>
                <div className="ayah-picker-backdrop" onClick={() => setJumpOpen(false)} />
                <div className="ayah-picker-popover mushaf-jump-popover" role="dialog" aria-label="Jump to page, Surah, or Juz">
                  <div className="ayah-picker-header">
                    <span>Jump to</span>
                    <button className="ayah-picker-close" onClick={() => setJumpOpen(false)} aria-label="Close">×</button>
                  </div>
                  <form onSubmit={submitJumpToPage} className="mushaf-jump-row">
                    <label>Page</label>
                    <input
                      type="number"
                      min="1"
                      max={TOTAL_MUSHAF_PAGES}
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      placeholder={String(pageNumber)}
                      className="select-input"
                    />
                    <button type="submit" className="btn btn-primary">Go</button>
                  </form>
                  <div className="mushaf-jump-row">
                    <label>Surah</label>
                    <select
                      className="select-input"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) pageForSurah(parseInt(e.target.value, 10)).then((p) => p && goToPage(p));
                        setJumpOpen(false);
                      }}
                    >
                      <option value="">Choose a Surah…</option>
                      {surahMeta.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.transliteration}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mushaf-jump-row">
                    <label>Juz</label>
                    <select
                      className="select-input"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) pageForJuz(parseInt(e.target.value, 10)).then((p) => p && goToPage(p));
                        setJumpOpen(false);
                      }}
                    >
                      <option value="">Choose a Juz…</option>
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                        <option key={j} value={j}>Juz {j}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </span>

          <button className="btn" onClick={() => goToPage(pageNumber + 1)} disabled={pageNumber >= TOTAL_MUSHAF_PAGES} aria-label="Next page">
            Next <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <ReciterSelect value={settings.reciter} onChange={audioPlayer.changeReciter} />
        </div>
        {wordModeUnavailable && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 10 }}>
            This reciter doesn't have word-level timing data — showing ayah-by-ayah tracking instead.
          </p>
        )}
      </div>

      {!pageData ? (
        <div className="mushaf-page-frame mushaf-page-loading" aria-busy="true">
          <div className="mushaf-skeleton-line" style={{ width: "40%", margin: "0 auto 22px" }} />
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="mushaf-skeleton-line" style={{ width: `${70 + ((i * 7) % 25)}%` }} />
          ))}
        </div>
      ) : (
        <div
          className="mushaf-page-frame"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mushaf-page-number">{pageNumber}</div>
          {pageRuns.map((item, idx) => {
            if (item.type === "surah-header") {
              const meta = surahByNumber(item.surah);
              return (
                <div className="mushaf-surah-header" key={idx}>
                  <span>سورة {meta?.arabic}</span>
                </div>
              );
            }
            if (item.type === "bismillah") {
              return (
                <div className="mushaf-bismillah" key={idx}>
                  <ArabicText text={BISMILLAH} />
                </div>
              );
            }
            const runs = item.runs;
            return (
              <div className="mushaf-line" key={idx}>
                {runs.map((run, runIdx) => {
                  const [surahNum, ayahNum] = run.verseKey.split(":").map(Number);
                  const refKey = run.verseKey;
                  const playing = isMySurahPlaying(surahNum) &&
                    (fullSurahMode ? audioPlayer.fullSurahActiveVerse === ayahNum : audioPlayer.playingVerse === ayahNum);
                  const activeWordRange = playing ? audioPlayer.activeWordRange : null;
                  const juzStartWord = run.words.find((w) => w.juz);
                  const textWords = run.words.filter((w) => !w.end);
                  const endWord = run.words.find((w) => w.end);
                  const meta = surahByNumber(surahNum);

                  return (
                    <span className="mushaf-ayah-wrap" key={runIdx}>
                      {juzStartWord && (
                        <span className="mushaf-juz-badge">
                          الجزء {JUZ_NAMES[juzStartWord.juz - 1] || juzStartWord.juz}
                        </span>
                      )}
                      <FlipNoteCard
                        compact
                        frontClickable
                        source="quran"
                        sourceKey={surahNum}
                        refKey={refKey}
                        sourceLabel={`${meta?.transliteration || surahNum} ${refKey}`}
                        excerpt={textWords.map((w) => w.t).join(" ")}
                        existing={notesByRef.get(refKey)}
                        onNoteChange={(note, deletedId) => handleNoteChange(refKey, note, deletedId)}
                        locked={!isPremiumUser}
                        onLockedTap={() => openPremiumOffer()}
                        front={
                          <span
                            className={"mushaf-words" + (playing ? " mushaf-ayah-playing" : "")}
                            onClick={() => setPrimaryVerse({ surah: surahNum, ayah: ayahNum })}
                          >
                            {textWords.map((w, i) => (
                              <span
                                key={i}
                                className={
                                  "ayah-word" +
                                  (playing &&
                                  activeWordRange &&
                                  w.wordIndex >= activeWordRange.start &&
                                  w.wordIndex < activeWordRange.end
                                    ? " ayah-word-active"
                                    : "")
                                }
                              >
                                <ArabicText text={w.t} />{" "}
                              </span>
                            ))}
                            {endWord && (
                              <span className="mushaf-ayah-end-cluster">
                                <span className="mushaf-ayah-end-roundel">
                                  <ArabicText text={endWord.t} />
                                </span>
                                {!fullSurahMode && (
                                  <button
                                    type="button"
                                    className={"mushaf-play-btn" + (playing ? " playing" : "")}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAyahPlay(surahNum, ayahNum);
                                    }}
                                    aria-label={playing ? "Pause verse" : "Play from here"}
                                    title={playing ? "Pause" : "Play from here"}
                                  >
                                    {playing ? <Pause size={15} /> : <Play size={15} />}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={"mushaf-inline-icon-btn" + (justMarkedVerse === refKey ? " marked" : "")}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkLastRead(surahNum, ayahNum);
                                  }}
                                  aria-label="Mark as last read"
                                  title="Mark as last read"
                                >
                                  <Bookmark size={11} />
                                </button>
                              </span>
                            )}
                          </span>
                        }
                      />
                      {" "}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      {justMarkedVerse && (
        <p className="mushaf-marked-toast">
          <BookOpen size={14} /> Marked {justMarkedVerse} as last read
        </p>
      )}
    </div>
  );
}
