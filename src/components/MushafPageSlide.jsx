import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Bookmark } from "lucide-react";
import ArabicText from "./ArabicText.jsx";
import FlipNoteCard from "./FlipNoteCard.jsx";
import { listNotesBySourceKey } from "../utils/notesDb.js";
import { fetchSurahJson } from "../utils/offline.js";
import { surahMeta } from "../data/surahMeta.js";
import {
  TOTAL_MUSHAF_PAGES,
  fetchMushafPage,
  loadPageFont,
  pageFontFamily,
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

// One page of the carousel window (see MushafPage.jsx) — fetches and renders
// exactly one Mushaf page's content, independently of its neighbors, so the
// previous/current/next slides can each load, cache, and highlight on their
// own. Lifted out of MushafPage itself so three of these can be mounted side
// by side without tripling that component's state.
export default function MushafPageSlide({
  pageNumber,
  audioPlayer,
  isPremiumUser,
  openPremiumOffer,
  surahJsonCacheRef,
  justMarkedVerse,
  onMarkLastRead,
  onTogglePlay,
  onAyahTap,
}) {
  const [pageData, setPageData] = useState(null);
  const [fontReady, setFontReady] = useState(false);
  const [error, setError] = useState(null);
  const [notesByRef, setNotesByRef] = useState(new Map());
  const frameRef = useRef(null);

  const outOfRange = pageNumber < 1 || pageNumber > TOTAL_MUSHAF_PAGES;

  useEffect(() => {
    if (outOfRange) return;
    let cancelled = false;
    setPageData(null);
    setFontReady(false);
    setError(null);
    fetchMushafPage(pageNumber)
      .then((data) => {
        if (!cancelled) setPageData(data);
      })
      .catch((err) => !cancelled && setError(err.message));
    loadPageFont(pageNumber)
      .then(() => {
        if (!cancelled) setFontReady(true);
      })
      .catch(() => {}); // keep showing the plain-text fallback on failure
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, outOfRange]);

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
  // within this line), since AudioPlayerContext's activeWordRange is a
  // single {start,end} pair over the ayah's full word count.
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
  // to hand off to AudioPlayerContext's toggleVerse, which expects the same
  // surah-object shape SurahReader gives it. Cached in a ref shared across
  // every slide (passed down from MushafPage) so adjacent pages sharing a
  // surah don't refetch it.
  useEffect(() => {
    for (const n of surahNumbersOnPage) {
      if (!surahJsonCacheRef.current.has(n)) {
        fetchSurahJson(n)
          .then((surah) => surahJsonCacheRef.current.set(n, surah))
          .catch(() => {});
      }
    }
  }, [surahNumbersOnPage, surahJsonCacheRef]);

  // Safety net under the CSS sizing in index.css's .mushaf-page-frame: that
  // formula is tuned to fit a typical 15-line page, but exact glyph widths
  // vary line to line and page to page, so this measures the *actual*
  // rendered content once it's on screen and shrinks --mushaf-fit (never
  // grows it past 1) just enough that nothing wraps or overflows — the one
  // hard requirement ("nothing cut off, cropped, or overflowing") a fixed
  // formula alone can't fully guarantee across all 604 pages.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !pageRuns) return;
    frame.style.setProperty("--mushaf-fit", "1");
    // Every ayah's (closed, invisible) note popover is position: absolute
    // — out of normal flow, so it can't actually push real page content —
    // but scrollWidth/scrollHeight still count an absolutely positioned
    // descendant's box when measuring its containing block, so it has to
    // be hidden for the length of this measurement or it'd read as if the
    // line needed room for a 260px-wide note editor that isn't even open.
    const backFaces = frame.querySelectorAll(".flip-note-back");
    const prevDisplay = [];
    backFaces.forEach((el) => {
      prevDisplay.push(el.style.display);
      el.style.display = "none";
    });
    const lines = frame.querySelectorAll(".mushaf-line");
    let ratio = 1;
    lines.forEach((line) => {
      if (line.scrollWidth > line.clientWidth + 0.5 && line.clientWidth > 0) {
        ratio = Math.min(ratio, line.clientWidth / line.scrollWidth);
      }
    });
    if (frame.scrollHeight > frame.clientHeight + 0.5 && frame.clientHeight > 0) {
      ratio = Math.min(ratio, frame.clientHeight / frame.scrollHeight);
    }
    backFaces.forEach((el, i) => {
      el.style.display = prevDisplay[i];
    });
    if (ratio < 1) {
      frame.style.setProperty("--mushaf-fit", String(Math.max(0.35, ratio * 0.97)));
    }
  }, [pageRuns, fontReady]);

  function handleNoteChange(refKey, note, deletedId) {
    setNotesByRef((prev) => {
      const next = new Map(prev);
      if (deletedId) next.delete(refKey);
      else next.set(refKey, note);
      return next;
    });
  }

  if (outOfRange) {
    return (
      <div className="mushaf-page-frame mushaf-page-edge">
        <span>{pageNumber < 1 ? "Beginning of the Mushaf" : "End of the Mushaf"}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mushaf-page-frame mushaf-page-edge">
        <span>Couldn't load this page. {error}</span>
      </div>
    );
  }

  if (!pageData || !pageRuns) {
    return (
      <div className="mushaf-page-frame mushaf-page-loading" aria-busy="true">
        <div className="mushaf-skeleton-line" style={{ width: "40%", margin: "0 auto 22px" }} />
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="mushaf-skeleton-line" style={{ width: `${70 + ((i * 7) % 25)}%` }} />
        ))}
      </div>
    );
  }

  const fullSurahMode = audioPlayer.fullSurahMode;
  const isMySurahPlaying = (surahNum) => audioPlayer.surahNumber === surahNum;

  return (
    <div className="mushaf-page-frame" ref={frameRef}>
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
                        onClick={() => onAyahTap(surahNum, ayahNum)}
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
                            {fontReady ? (
                              <span className="mushaf-glyph" style={{ fontFamily: pageFontFamily(pageNumber) }}>
                                {w.g}
                              </span>
                            ) : (
                              <>
                                <ArabicText text={w.t} />{" "}
                              </>
                            )}
                          </span>
                        ))}
                        {endWord && (
                          <span className="mushaf-ayah-end-cluster">
                            <span className="mushaf-ayah-end-roundel">
                              {fontReady ? (
                                <span className="mushaf-glyph" style={{ fontFamily: pageFontFamily(pageNumber) }}>
                                  {endWord.g}
                                </span>
                              ) : (
                                <ArabicText text={endWord.t} />
                              )}
                            </span>
                            {!fullSurahMode && (
                              <button
                                type="button"
                                className={"mushaf-play-btn" + (playing ? " playing" : "")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePlay(surahNum, ayahNum);
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
                                onMarkLastRead(surahNum, ayahNum);
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
                  {!fontReady && " "}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
