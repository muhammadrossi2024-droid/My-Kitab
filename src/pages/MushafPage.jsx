import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAudioPlayer } from "../context/AudioPlayerContext.jsx";
import { usePremium } from "../context/PremiumContext.jsx";
import { useIntro } from "../context/IntroContext.jsx";
import QuranViewToggle from "../components/QuranViewToggle.jsx";
import MushafPageSlide from "../components/MushafPageSlide.jsx";
import { supportsWordTiming } from "../data/reciters.js";
import ReciterSelect from "../components/ReciterSelect.jsx";
import { surahMeta } from "../data/surahMeta.js";
import {
  TOTAL_MUSHAF_PAGES,
  fetchMushafPage,
  loadPageFont,
  pageForAyah,
  pageForSurah,
  pageForJuz,
} from "../utils/mushaf.js";

const CHROME_HIDE_DELAY_MS = 3200;
const SCROLL_SETTLE_MS = 130;

export default function MushafPage() {
  const { pageNumber: pageNumberParam } = useParams();
  const pageNumber = Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, parseInt(pageNumberParam, 10) || 1));
  const navigate = useNavigate();
  const { settings, updateSettings, setLastRead } = useSettings();
  const { isPremiumUser, openPremiumOffer } = usePremium();
  const audioPlayer = useAudioPlayer();
  const { activeTour } = useIntro();

  const [currentPageData, setCurrentPageData] = useState(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState("");
  const [primaryVerse, setPrimaryVerse] = useState(null); // {surah, ayah} — last ayah the user interacted with
  const [justMarkedVerse, setJustMarkedVerse] = useState(null); // "surah:ayah", briefly shown after marking last read
  const [chromeVisible, setChromeVisible] = useState(true);
  const [showPageBadge, setShowPageBadge] = useState(false);
  const [livePageNumber, setLivePageNumber] = useState(pageNumber);

  const surahJsonCacheRef = useRef(new Map()); // surahNumber -> loaded surah JSON (for audio playback), shared by every slide
  const markedTimeoutRef = useRef(null);
  const followedVerseRef = useRef(null); // last verse we auto-followed playback to
  const carouselRef = useRef(null);
  const settleTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const pageNumberRef = useRef(pageNumber);
  const badgeFadeRef = useRef(null);

  useEffect(() => {
    pageNumberRef.current = pageNumber;
  }, [pageNumber]);

  const reciterSupportsWord = supportsWordTiming(settings.reciter);
  const wordModeUnavailable = settings.followAlong === "word" && !reciterSupportsWord;

  // Lightweight fetch of just the current page's data — MushafPage.jsx no
  // longer renders content itself (MushafPageSlide does), but still needs
  // this to find the first ayah on the page for the Scroll View handoff.
  // fetchMushafPage's own in-memory cache means this never costs a second
  // network round trip beyond what the slide already triggered.
  useEffect(() => {
    let cancelled = false;
    fetchMushafPage(pageNumber)
      .then((d) => !cancelled && setCurrentPageData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pageNumber]);

  // The carousel already keeps the previous/next pages mounted (and so
  // fetching), so this only needs to warm one page further out in each
  // direction for uninterrupted continued swiping.
  useEffect(() => {
    fetchMushafPage(pageNumber + 2).catch(() => {});
    fetchMushafPage(pageNumber - 2).catch(() => {});
    loadPageFont(pageNumber + 2).catch(() => {});
    loadPageFont(pageNumber - 2).catch(() => {});
  }, [pageNumber]);

  useEffect(() => {
    return () => {
      if (markedTimeoutRef.current) clearTimeout(markedTimeoutRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (badgeFadeRef.current) clearTimeout(badgeFadeRef.current);
    };
  }, []);

  const fullSurahMode = audioPlayer.fullSurahMode;

  // Follows recitation across page boundaries — navigates to whichever page
  // the currently-playing ayah lives on, if it isn't already this one.
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

  // --- Chrome (floating controls) auto-hide -------------------------------

  function bumpChrome() {
    setChromeVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (activeTour) return; // never auto-hide mid guided-tour — it needs the real controls on screen
    hideTimerRef.current = setTimeout(() => setChromeVisible(false), CHROME_HIDE_DELAY_MS);
  }

  useEffect(() => {
    bumpChrome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chromeShown = chromeVisible || jumpOpen || !!activeTour;

  // --- Carousel: keep the window centered on the current page ------------

  useLayoutEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollLeft = el.clientWidth;
  }, [pageNumber]);

  useEffect(() => {
    function onResize() {
      const el = carouselRef.current;
      if (!el) return;
      el.scrollLeft = el.clientWidth;
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function runSettle() {
    const el = carouselRef.current;
    if (!el) return;
    const slideWidth = el.clientWidth || 1;
    const index = Math.min(2, Math.max(0, Math.round(el.scrollLeft / slideWidth)));
    const cur = pageNumberRef.current;
    const raw = index === 0 ? cur - 1 : index === 2 ? cur + 1 : cur;
    const clamped = Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, raw));
    if (index !== 1 && clamped !== cur) {
      navigate(`/quran/page/${clamped}`);
    } else if (Math.round(el.scrollLeft) !== slideWidth) {
      el.scrollTo({ left: slideWidth, behavior: "smooth" }); // spring back — hit the start/end of the Mushaf
    }
    if (badgeFadeRef.current) clearTimeout(badgeFadeRef.current);
    badgeFadeRef.current = setTimeout(() => setShowPageBadge(false), 550);
  }

  // 'scrollend' fires the instant native momentum/snap settles (most
  // browsers as of 2026) — the timeout in handleScroll below is only a
  // fallback for engines that don't support it yet.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || !("onscrollend" in window)) return;
    function handleScrollEnd() {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      runSettle();
    }
    el.addEventListener("scrollend", handleScrollEnd);
    return () => el.removeEventListener("scrollend", handleScrollEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    bumpChrome();
    const el = carouselRef.current;
    if (el) {
      const slideWidth = el.clientWidth || 1;
      const liveIndex = Math.min(2, Math.max(0, Math.round(el.scrollLeft / slideWidth)));
      const cur = pageNumberRef.current;
      const live = liveIndex === 0 ? cur - 1 : liveIndex === 2 ? cur + 1 : cur;
      setLivePageNumber(Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, live)));
    }
    setShowPageBadge(true);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(runSettle, SCROLL_SETTLE_MS);
  }

  function scrollToIndex(index) {
    const el = carouselRef.current;
    if (!el) return;
    const target = index * el.clientWidth;
    const startLeft = el.scrollLeft;
    el.scrollTo({ left: target, behavior: "smooth" });
    // Belt-and-suspenders: a handful of engines/embedding contexts quietly
    // no-op an animated scrollTo (seen under some automated/CDP-driven
    // browsers, and plausible under aggressive reduced-motion handling) —
    // if it genuinely hasn't budged shortly after, jump there directly
    // rather than leaving Previous/Next looking unresponsive. A forced
    // scrollLeft jump like that also isn't guaranteed to fire a native
    // 'scroll' event in every engine, so finish the navigation explicitly
    // here too instead of waiting on handleScroll/runSettle to notice it.
    setTimeout(() => {
      if (Math.abs(el.scrollLeft - startLeft) < 2 && Math.abs(el.scrollLeft - target) > 2) {
        el.scrollLeft = target;
        setShowPageBadge(true);
        runSettle();
      }
    }, 220);
  }

  function stepPage(delta) {
    scrollToIndex(1 + delta);
  }

  function handleCarouselKeyDown(e) {
    if (e.key === "ArrowRight" && pageNumber < TOTAL_MUSHAF_PAGES) {
      e.preventDefault();
      stepPage(1);
    } else if (e.key === "ArrowLeft" && pageNumber > 1) {
      e.preventDefault();
      stepPage(-1);
    }
  }

  // --- Navigation / jump-to ------------------------------------------------

  function goToPage(n) {
    const clamped = Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, n));
    navigate(`/quran/page/${clamped}`);
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
    if (!currentPageData) return null;
    for (const item of currentPageData.items) {
      if (item.type === "line" && item.words.length > 0) {
        const [surah, ayah] = item.words[0].v.split(":").map(Number);
        return { surah, ayah };
      }
    }
    return null;
  }

  function submitJumpToPage(e) {
    e.preventDefault();
    const n = parseInt(jumpPageInput, 10);
    if (n) goToPage(n);
    setJumpOpen(false);
    setJumpPageInput("");
  }

  // --- Ayah interactions ----------------------------------------------------

  function handleAyahTap(surahNum, ayahNum) {
    setPrimaryVerse({ surah: surahNum, ayah: ayahNum });
  }

  function handleTogglePlay(surahNum, ayahNum) {
    const surah = surahJsonCacheRef.current.get(surahNum);
    if (!surah) return;
    setPrimaryVerse({ surah: surahNum, ayah: ayahNum });
    audioPlayer.toggleVerse(surah, ayahNum);
  }

  function handleMarkLastRead(surahNum, ayahNum) {
    setPrimaryVerse({ surah: surahNum, ayah: ayahNum });
    setLastRead(surahNum, ayahNum);
    setJustMarkedVerse(`${surahNum}:${ayahNum}`);
    if (markedTimeoutRef.current) clearTimeout(markedTimeoutRef.current);
    markedTimeoutRef.current = setTimeout(() => setJustMarkedVerse(null), 2000);
  }

  const slideProps = {
    audioPlayer,
    isPremiumUser,
    openPremiumOffer,
    surahJsonCacheRef,
    justMarkedVerse,
    onMarkLastRead: handleMarkLastRead,
    onTogglePlay: handleTogglePlay,
    onAyahTap: handleAyahTap,
  };

  return (
    <div className="mushaf-immersive" onPointerDown={bumpChrome}>
      <div className={"mushaf-chrome" + (chromeShown ? "" : " mushaf-chrome-hidden")}>
        <div className="mushaf-chrome-row">
          <button className="mushaf-chrome-back" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={18} strokeWidth={2.25} />
          </button>
          <QuranViewToggle mode="page" onSelect={handleModeSelect} />
          <span className="mushaf-jump-wrap">
            <button className="ayah-picker-trigger mushaf-page-pill" onClick={() => setJumpOpen((v) => !v)}>
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
        </div>

        <div className="mushaf-chrome-row mushaf-chrome-row-secondary">
          <button
            className="btn mushaf-step-btn"
            onClick={() => stepPage(-1)}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <ReciterSelect value={settings.reciter} onChange={audioPlayer.changeReciter} />
          <button
            className="btn mushaf-step-btn"
            onClick={() => stepPage(1)}
            disabled={pageNumber >= TOTAL_MUSHAF_PAGES}
            aria-label="Next page"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
        {wordModeUnavailable && (
          <p className="mushaf-word-mode-note">
            This reciter doesn't have word-level timing data — showing ayah-by-ayah tracking instead.
          </p>
        )}
      </div>

      <div
        className="mushaf-carousel"
        ref={carouselRef}
        onScroll={handleScroll}
        onKeyDown={handleCarouselKeyDown}
        tabIndex={0}
        role="group"
        aria-label={`Mushaf page ${pageNumber} of ${TOTAL_MUSHAF_PAGES}`}
      >
        {[pageNumber - 1, pageNumber, pageNumber + 1].map((pn) => (
          <div className="mushaf-slide" key={pn}>
            <MushafPageSlide pageNumber={pn} {...slideProps} />
          </div>
        ))}
      </div>

      {showPageBadge && <div className="mushaf-page-badge">{livePageNumber}</div>}

      {justMarkedVerse && (
        <p className="mushaf-marked-toast">
          <BookOpen size={14} /> Marked {justMarkedVerse} as last read
        </p>
      )}
    </div>
  );
}
