import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import { useNavVisibility } from "../context/NavVisibilityContext.jsx";

// This tour drives the app itself rather than just narrating it: it clicks
// real elements (a genuine `el.click()`, not a simulated coordinate tap) and
// scrolls the real page, so navigation and side effects (e.g. actually
// marking an ayah as last read) are the real thing, not a mock.

const TOTAL_STEPS = 11;
const FIND_TIMEOUT_MS = 4000;
const FIND_POLL_MS = 100;
const TEXT_FADE_MS = 150;
const TAP_RIPPLE_MS = 480;
// Required hold at every tap, highlight, and scroll-stop point.
const PAUSE_MS = 2500;
// Short technical buffer after a click/navigate before the next thing is
// measured — not one of the required "stops", just enough for the DOM/route
// to catch up.
const SETTLE_MS = 400;
const SCROLL_MIN_MS = 900;
const SCROLL_MAX_MS = 2200;

const CARD_MAX_WIDTH = 360;
const CARD_MARGIN = 16;
const CARD_GAP = 24; // gap between the card and its target/screen edge

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Waits for the next two paints (see settleAndMeasure below), racing a plain
// timer so a backgrounded tab (where rAF is suspended) can't hang forever.
function nextPaint() {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 120);
  });
}

// Waits for the target's layout to actually settle — fonts loaded, a couple
// of frames past that — before reading its bounds, so the spotlight never
// snaps to a stale pre-layout position.
async function settleAndMeasure(el, { scrollIntoView } = {}) {
  if (scrollIntoView) {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }
  if (document.fonts && document.fonts.status !== "loaded") {
    try {
      await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);
    } catch {
      // Proceed with whatever's loaded — a missing webfont shouldn't block the tour forever.
    }
  }
  await nextPaint();
  return el.getBoundingClientRect();
}

function waitForSelector(selector, cancelRef, timeoutMs = FIND_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    function poll() {
      if (cancelRef.current) return resolve(null);
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - startedAt > timeoutMs) return resolve(null);
      setTimeout(poll, FIND_POLL_MS);
    }
    poll();
  });
}

// Like waitForSelector, but returns the Nth match (0-indexed) — used to grab
// Ayah 4's Mark Ayah button specifically rather than the first one on the
// page.
function waitForNthSelector(selector, index, cancelRef, timeoutMs = FIND_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    function poll() {
      if (cancelRef.current) return resolve(null);
      const els = document.querySelectorAll(selector);
      if (els.length > index) return resolve(els[index]);
      if (Date.now() - startedAt > timeoutMs) return resolve(null);
      setTimeout(poll, FIND_POLL_MS);
    }
    poll();
  });
}

// A real, eased, interruptible scroll animation (not scrollIntoView, which
// jumps or which the browser's own "smooth" timing can't be controlled or
// awaited precisely) — `onFrame` fires every animation frame so the caller
// can re-measure and re-anchor a spotlight in lockstep, with zero drift,
// rather than measuring once and hoping nothing moved. Duration scales with
// distance (clamped to a generous min/max) specifically so a multi-ayah
// scroll reads as visibly passing each ayah, not a jump-cut.
function animateScrollTo(targetY, cancelRef, onFrame) {
  return new Promise((resolve) => {
    const startY = window.scrollY;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clampedTarget = clamp(targetY, 0, maxY);
    const distance = clampedTarget - startY;
    if (Math.abs(distance) < 2) {
      onFrame?.();
      resolve();
      return;
    }
    const duration = clamp(Math.abs(distance) * 1.1, SCROLL_MIN_MS, SCROLL_MAX_MS);
    const startTime = performance.now();
    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function tick(now) {
      if (cancelRef.current) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, startY + distance * ease(t));
      onFrame?.();
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

export default function GuidedTour({ onDone }) {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const navigate = useNavigate();
  const { lock: lockNav, unlock: unlockNav, show: showNav } = useNavVisibility();

  // What's on screen right now — driven imperatively by runTour() below,
  // not derived from a step list, since the tour is now a live script
  // rather than a series of "wait for the user to click Next" states.
  const [display, setDisplay] = useState({ kind: "center", rect: null, shape: "circle", live: false });
  const [cardText, setCardText] = useState({ title: "Welcome", text: "", step: null, key: 0 });
  const [tapEffect, setTapEffect] = useState(null);
  const [isFinal, setIsFinal] = useState(false);

  const cancelledRef = useRef(false);
  const advanceRef = useRef(null); // resolves the current interruptible dwell, if any
  const startedRef = useRef(false);
  const tapIdRef = useRef(0);
  const cardKeyRef = useRef(0);
  const cardRef = useRef(null);
  const [cardPos, setCardPos] = useState(null);

  function sleepInterruptible(ms) {
    return new Promise((resolve) => {
      if (cancelledRef.current) {
        resolve();
        return;
      }
      const t = setTimeout(() => {
        advanceRef.current = null;
        resolve();
      }, ms);
      advanceRef.current = () => {
        clearTimeout(t);
        advanceRef.current = null;
        resolve();
      };
    });
  }

  function setCard(title, text, step) {
    cardKeyRef.current += 1;
    setCardText({ title, text, step, key: cardKeyRef.current });
  }

  // Ripple at the target's center, then clear it — the visible "this is
  // what got tapped" indicator required before every navigation.
  async function doTap(rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    tapIdRef.current += 1;
    setTapEffect({ x: cx, y: cy, id: tapIdRef.current });
    await sleep(TAP_RIPPLE_MS);
    if (!cancelledRef.current) setTapEffect(null);
  }

  // Rings a target and shows its tooltip together (never the ring alone with
  // stale text), then holds for the required 2.5s before anything else
  // happens. Returns the measured rect, or null if cancelled/not found.
  async function ringAndPause(el, shape, title, text, step) {
    const rect = await settleAndMeasure(el);
    if (cancelledRef.current) return null;
    setDisplay({ kind: "spotlight", rect, shape, live: false });
    if (title != null) setCard(title, text, step);
    await sleepInterruptible(PAUSE_MS);
    if (cancelledRef.current) return null;
    return rect;
  }

  // Ripple, then the real click, then a brief technical settle (not one of
  // the required pause points — just long enough for the resulting
  // navigation/state change to land before the caller measures again).
  async function tapAndSettle(el, rect) {
    await doTap(rect);
    if (cancelledRef.current) return;
    el.click();
    await sleep(SETTLE_MS);
  }

  // The common shape for "find a nav icon, ring + pause, tap it, let it
  // navigate" — used for every plain nav-icon step.
  async function tapNavStep({ selector, step, title, text, thenSelector, thenTitle, thenText }) {
    const el = await waitForSelector(selector, cancelledRef);
    if (!el || cancelledRef.current) return;
    const rect = await ringAndPause(el, "circle", title, text, step);
    if (!rect || cancelledRef.current) return;
    await tapAndSettle(el, rect);
    if (cancelledRef.current) return;

    if (thenSelector) {
      const el2 = await waitForSelector(thenSelector, cancelledRef);
      if (!el2 || cancelledRef.current) return;
      const rect2 = await settleAndMeasure(el2, { scrollIntoView: true });
      if (cancelledRef.current) return;
      setDisplay({ kind: "spotlight", rect: rect2, shape: "rounded", live: false });
      setCard(thenTitle, thenText, step);
      await sleepInterruptible(PAUSE_MS);
    }
  }

  async function runTour() {
    lockNav();

    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    setCard("Welcome", "Assalamu alaikum! Sit back and watch a quick walkthrough of My Kitab.", null);
    await sleepInterruptible(PAUSE_MS);
    if (cancelledRef.current) return;

    // Step 1 — tap Quran
    await tapNavStep({
      selector: '[data-tour-id="/surahs"]',
      step: 1,
      title: "Quran",
      text: "The full Qur'an, with Arabic text and English translation.",
    });
    if (cancelledRef.current) return;

    // Bridge into Step 2 — open Al-Fatihah
    const surahRow = await waitForSelector(".surah-list-item", cancelledRef);
    if (!surahRow || cancelledRef.current) return;
    const rowRect = await ringAndPause(
      surahRow,
      "rounded",
      "Opening a Surah",
      "Let's open Al-Fatihah to see the reading view.",
      2
    );
    if (!rowRect || cancelledRef.current) return;
    await tapAndSettle(surahRow, rowRect);
    if (cancelledRef.current) return;

    // Step 2 — scroll down to Ayah 4 (visibly passing Ayahs 1-3)
    const markBtn4 = await waitForNthSelector(".mark-last-read-btn", 3, cancelledRef);
    if (!markBtn4 || cancelledRef.current) return;
    window.scrollTo(0, 0);
    await sleep(300);
    if (cancelledRef.current) return;

    const initialRect = markBtn4.getBoundingClientRect();
    const targetY = window.scrollY + initialRect.top - (window.innerHeight / 2 - initialRect.height / 2);
    setCard("Ayah 4", "Scrolling down through Ayahs 1, 2, and 3 to reach Ayah 4…", 2);
    await animateScrollTo(targetY, cancelledRef, () => {
      const r = markBtn4.getBoundingClientRect();
      setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: true });
    });
    if (cancelledRef.current) return;

    const settled4 = await settleAndMeasure(markBtn4);
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: settled4, shape: "rounded", live: false });
    setCard("Ayah 4", "Here's Ayah 4 — the Mark Ayah button sits right below it.", 2);
    await sleepInterruptible(PAUSE_MS);
    if (cancelledRef.current) return;

    // Step 3 — tap Mark Ayah on Ayah 4
    const rect3 = await ringAndPause(
      markBtn4,
      "rounded",
      "Mark Ayah",
      "Tap this under Ayah 4 to save your place as you read.",
      3
    );
    if (!rect3 || cancelledRef.current) return;
    await tapAndSettle(markBtn4, rect3);
    if (cancelledRef.current) return;
    const markedRect = markBtn4.getBoundingClientRect();
    setDisplay({ kind: "spotlight", rect: markedRect, shape: "rounded", live: false });
    setCard("Mark Ayah", "Saved — Ayah 4 is now your last read position.", 3);
    await sleepInterruptible(PAUSE_MS);
    if (cancelledRef.current) return;

    // Step 4 — Continue Reading. First, a bridge back to the surah list,
    // where the Continue Reading pill now lives (it only renders once a
    // position is saved).
    const quranNavAgain = await waitForSelector('[data-tour-id="/surahs"]', cancelledRef);
    if (!quranNavAgain || cancelledRef.current) return;
    const backRect = await ringAndPause(
      quranNavAgain,
      "circle",
      "Back to the List",
      "Let's go back to the surah list to see Continue Reading.",
      4
    );
    if (!backRect || cancelledRef.current) return;
    await tapAndSettle(quranNavAgain, backRect);
    if (cancelledRef.current) return;

    const resumeLink = await waitForSelector(".resume-reading-link", cancelledRef);
    if (!resumeLink || cancelledRef.current) return;
    const resumeRect = await ringAndPause(
      resumeLink,
      "rounded",
      "Continue Reading",
      "This picks up right where you left off — tap it to jump back to Ayah 4.",
      4
    );
    if (!resumeRect || cancelledRef.current) return;
    await tapAndSettle(resumeLink, resumeRect);
    if (cancelledRef.current) return;

    // The reader page has its own effect that smooth-scrolls to the #ayah-N
    // hash on load — let that finish before taking over with our own
    // scroll/ring so the two don't fight each other.
    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    await sleep(1200);
    if (cancelledRef.current) return;
    const ayah4Block = document.getElementById("ayah-4");
    if (ayah4Block && !cancelledRef.current) {
      const r = await settleAndMeasure(ayah4Block);
      if (cancelledRef.current) return;
      setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
      setCard("Continue Reading", "And there we are — right back at Ayah 4.", 4);
      await sleepInterruptible(PAUSE_MS);
      if (cancelledRef.current) return;
    }

    // Step 5 — scroll back up to the top of the Quran section
    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    setCard("Back to the Top", "Scrolling back up to the top of the page.", 5);
    await sleep(SETTLE_MS);
    if (cancelledRef.current) return;
    await animateScrollTo(0, cancelledRef, null);
    if (cancelledRef.current) return;
    await sleepInterruptible(PAUSE_MS);
    if (cancelledRef.current) return;

    // Step 6 — tap Mutoon
    await tapNavStep({
      selector: '[data-tour-id="/mutoon"]',
      step: 6,
      title: "Mutoon",
      text: "Classical texts for the student of knowledge, laid out page by page.",
    });
    if (cancelledRef.current) return;

    // Step 7 — tap Thikr
    await tapNavStep({
      selector: '[data-tour-id="/athkar"]',
      step: 7,
      title: "Thikr",
      text: "Morning and evening remembrances, with translations and repetition counts.",
    });
    if (cancelledRef.current) return;

    // Step 8 — tap Library
    await tapNavStep({
      selector: '[data-tour-id="/my-kitab"]',
      step: 8,
      title: "Library",
      text: "Your personal library — upload your own PDFs and search within them.",
    });
    if (cancelledRef.current) return;

    // Step 9 — tap Search
    await tapNavStep({
      selector: '[data-tour-id="/search"]',
      step: 9,
      title: "Search",
      text: "Search the Qur'an, Mutoon, and Hadith by topic or keyword.",
      thenSelector: ".search-input",
      thenTitle: "Search",
      thenText: 'Type here to search — try a concept like "patience".',
    });
    if (cancelledRef.current) return;

    // Step 10 — tap Settings
    await tapNavStep({
      selector: '[data-tour-id="/settings"]',
      step: 10,
      title: "Settings",
      text: "Your reciter, font sizes, theme, and reading preferences.",
    });
    if (cancelledRef.current) return;

    // Step 11 — Done
    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    setCard(
      "You're All Set",
      "That's everything — enjoy exploring My Kitab. You can start this tour again anytime from the Home screen.",
      11
    );
    setIsFinal(true);
    showNav();
    unlockNav();
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // The tour drives its own scroll — block the user's wheel/touch/key
    // scroll input for the duration so it can't fight the script or desync
    // the spotlight, without disabling window.scrollTo (a JS call, not an
    // input event, so it's unaffected by these listeners).
    function preventWheelTouch(e) {
      e.preventDefault();
    }
    function preventScrollKeys(e) {
      if (SCROLL_KEYS.has(e.key)) e.preventDefault();
    }
    window.addEventListener("wheel", preventWheelTouch, { passive: false });
    window.addEventListener("touchmove", preventWheelTouch, { passive: false });
    window.addEventListener("keydown", preventScrollKeys);

    runTour();

    return () => {
      cancelledRef.current = true;
      advanceRef.current?.();
      showNav();
      unlockNav();
      window.removeEventListener("wheel", preventWheelTouch);
      window.removeEventListener("touchmove", preventWheelTouch);
      window.removeEventListener("keydown", preventScrollKeys);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSkip() {
    cancelledRef.current = true;
    advanceRef.current?.();
    navigate("/");
    onDone();
  }

  function handleDone() {
    navigate("/");
    onDone();
  }

  // Text cross-fade, decoupled from the ring's position — fades out, swaps,
  // fades back in, instead of jump-cutting the instant the text changes.
  const [textShown, setTextShown] = useState(cardText);
  const [textFading, setTextFading] = useState(false);
  useEffect(() => {
    if (cardText.key === textShown.key) return;
    setTextFading(true);
    const t = setTimeout(() => {
      setTextShown(cardText);
      setTextFading(false);
    }, TEXT_FADE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardText]);

  const showCard = display.kind === "center" || !!display.rect;
  const cardBelow = display.kind === "spotlight" && display.rect && display.rect.top < window.innerHeight / 2;

  useLayoutEffect(() => {
    if (!showCard) {
      setCardPos(null);
      return;
    }
    const el = cardRef.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(CARD_MAX_WIDTH, vw - CARD_MARGIN * 2);
    const height = el.getBoundingClientRect().height;

    let left;
    let top;
    if (display.kind === "center" || !display.rect) {
      left = (vw - width) / 2;
      top = (vh - height) / 2;
    } else {
      const preferredCenterX = display.rect.left + display.rect.width / 2;
      left = preferredCenterX - width / 2;
      top = cardBelow ? display.rect.bottom + CARD_GAP : display.rect.top - CARD_GAP - height;
    }

    left = clamp(left, CARD_MARGIN, vw - width - CARD_MARGIN);
    top = clamp(top, CARD_MARGIN, vh - height - CARD_MARGIN);

    setCardPos({ left, top, width });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCard, display, cardBelow, textShown]);

  // While `display.live` is true (mid-scroll, re-anchoring every frame) the
  // ring/arrow/card position transition is turned off so they track the
  // target 1:1 with zero lag; the normal eased CSS transition returns for
  // every discrete step-to-step move.
  const liveStyle = display.live ? { transition: "none" } : undefined;

  return (
    <div className="tour-overlay">
      <div className="tour-input-blocker" />
      {(display.kind === "center" || !display.rect) && <div className="tour-backdrop" />}
      {display.kind === "spotlight" && display.rect && (
        <>
          <div
            className={"tour-spotlight" + (display.shape === "circle" ? " circle" : " rounded")}
            style={{
              top: display.rect.top - 8,
              left: display.rect.left - 8,
              width: display.rect.width + 16,
              height: display.rect.height + 16,
              ...liveStyle,
            }}
          />
          <div
            className={"tour-arrow" + (cardBelow ? " up" : " down")}
            style={{
              left: display.rect.left + display.rect.width / 2,
              top: cardBelow ? display.rect.bottom + 10 : display.rect.top - 18,
              ...liveStyle,
            }}
          />
        </>
      )}

      {tapEffect && (
        <span key={tapEffect.id} className="tour-tap-ripple" style={{ left: tapEffect.x, top: tapEffect.y }} />
      )}

      {showCard && (
        <div
          ref={cardRef}
          className="tour-card"
          style={
            cardPos
              ? {
                  left: cardPos.left,
                  top: cardPos.top,
                  width: cardPos.width,
                  visibility: "visible",
                  ...liveStyle,
                }
              : {
                  left: 0,
                  top: 0,
                  width: Math.min(CARD_MAX_WIDTH, window.innerWidth - CARD_MARGIN * 2),
                  visibility: "hidden",
                }
          }
        >
          <img src={logoSrc} alt="" className="chat-avatar tour-card-avatar" />
          <div className={"tour-card-body" + (textFading ? " fading" : "")}>
            <div className="tour-card-title">{textShown.title}</div>
            <p className="tour-card-text">{textShown.text}</p>
            <div className="tour-card-actions">
              <span className="tour-card-progress">
                {textShown.step != null ? `${textShown.step} / ${TOTAL_STEPS}` : ""}
              </span>
              {isFinal && (
                <button className="btn btn-primary tour-next-btn" onClick={handleDone}>
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button className="tour-skip-btn" onClick={handleSkip}>
        <X className="tour-skip-icon" strokeWidth={2.5} />
        Skip
      </button>
    </div>
  );
}
