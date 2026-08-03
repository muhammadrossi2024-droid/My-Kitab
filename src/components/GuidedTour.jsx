import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import { useNavVisibility } from "../context/NavVisibilityContext.jsx";

// This tour drives the app itself rather than just narrating it: it clicks
// real elements (a genuine `el.click()`, not a simulated coordinate tap) and
// scrolls the real page, so navigation and side effects (e.g. actually
// marking an ayah as last read) are the real thing, not a mock.

const FIND_TIMEOUT_MS = 4000;
const FIND_POLL_MS = 100;
const TEXT_FADE_MS = 150;
const TAP_RIPPLE_MS = 480;
// Required "brief pause" between one action finishing and the next starting.
const POST_ACTION_PAUSE_MS = 500;
// Lets the ring visibly land on a target before the tap fires, so the tap
// reads as deliberate rather than instantaneous.
const PRE_TAP_SETTLE_MS = 500;
const DWELL_MS = 1900;
const DWELL_LONG_MS = 2300;
const WELCOME_DWELL_MS = 2400;
const SCROLL_MIN_MS = 550;
const SCROLL_MAX_MS = 1400;

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

// A real, eased, interruptible scroll animation (not scrollIntoView, which
// jumps or which the browser's own "smooth" timing can't be controlled or
// awaited precisely) — `onFrame` fires every animation frame so the caller
// can re-measure and re-anchor a spotlight in lockstep, with zero drift,
// rather than measuring once and hoping nothing moved.
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
    const duration = clamp(Math.abs(distance) * 0.7, SCROLL_MIN_MS, SCROLL_MAX_MS);
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

  // The common shape for "find a nav icon, ring it, tap it, let it
  // navigate, then hold a tooltip on it" — used for every step except the
  // Quran reading demo, which has its own bespoke scroll choreography.
  async function tapNavStep({ selector, step, title, text, thenSelector, thenTitle, thenText }) {
    const el = await waitForSelector(selector, cancelledRef);
    if (!el || cancelledRef.current) return;
    const rect = await settleAndMeasure(el);
    if (cancelledRef.current) return;
    // Ring and text land together — showing the ring alone first (with the
    // previous step's stale text still up) reads as a mismatch, as if the
    // tour had already moved on before it actually described anything.
    setDisplay({ kind: "spotlight", rect, shape: "circle", live: false });
    setCard(title, text, step);
    await sleep(PRE_TAP_SETTLE_MS);
    if (cancelledRef.current) return;
    await doTap(rect);
    if (cancelledRef.current) return;
    el.click();
    await sleep(POST_ACTION_PAUSE_MS);
    if (cancelledRef.current) return;

    const settledRect = el.getBoundingClientRect();
    setDisplay({ kind: "spotlight", rect: settledRect, shape: "circle", live: false });
    await sleepInterruptible(DWELL_MS);
    if (cancelledRef.current) return;

    if (thenSelector) {
      const el2 = await waitForSelector(thenSelector, cancelledRef);
      if (!el2 || cancelledRef.current) return;
      const rect2 = await settleAndMeasure(el2, { scrollIntoView: true });
      if (cancelledRef.current) return;
      setDisplay({ kind: "spotlight", rect: rect2, shape: "rounded", live: false });
      setCard(thenTitle, thenText, step);
      await sleepInterruptible(DWELL_MS);
    }
  }

  async function runTour() {
    lockNav();

    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    setCard("Welcome", "Assalamu alaikum! Sit back and watch a quick walkthrough of My Kitab.", null);
    await sleepInterruptible(WELCOME_DWELL_MS);
    if (cancelledRef.current) return;

    // Step 1 — tap Quran
    await tapNavStep({
      selector: '[data-tour-id="/surahs"]',
      step: 1,
      title: "Quran",
      text: "The full Qur'an, with Arabic text and English translation.",
    });
    if (cancelledRef.current) return;

    // Step 2 — open a surah, scroll down to the first Mark Ayah button, tap it
    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    setCard("Opening a Surah", "Let's open Al-Fatihah to see the reading view.", 2);
    const surahRow = await waitForSelector(".surah-list-item", cancelledRef);
    if (!surahRow || cancelledRef.current) return;
    const rowRect = await settleAndMeasure(surahRow);
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: rowRect, shape: "rounded", live: false });
    await sleep(PRE_TAP_SETTLE_MS);
    if (cancelledRef.current) return;
    await doTap(rowRect);
    if (cancelledRef.current) return;
    surahRow.click();
    await sleep(POST_ACTION_PAUSE_MS);
    if (cancelledRef.current) return;

    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    const markBtn = await waitForSelector(".mark-last-read-btn", cancelledRef);
    if (!markBtn || cancelledRef.current) return;
    window.scrollTo(0, 0);
    await sleep(300);
    if (cancelledRef.current) return;

    const initialMarkRect = markBtn.getBoundingClientRect();
    const targetY = window.scrollY + initialMarkRect.top - (window.innerHeight / 2 - initialMarkRect.height / 2);
    setCard("Mark Ayah", "Scrolling down to find the Mark Ayah button…", 2);
    await animateScrollTo(targetY, cancelledRef, () => {
      const r = markBtn.getBoundingClientRect();
      setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: true });
    });
    if (cancelledRef.current) return;

    const settledMarkRect = await settleAndMeasure(markBtn);
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: settledMarkRect, shape: "rounded", live: false });
    setCard("Mark Ayah", "Tap this under any ayah to save your place as you read.", 2);
    await sleepInterruptible(DWELL_MS);
    if (cancelledRef.current) return;

    await doTap(settledMarkRect);
    if (cancelledRef.current) return;
    markBtn.click();
    await sleep(250);
    if (cancelledRef.current) return;
    const markedRect = markBtn.getBoundingClientRect();
    setDisplay({ kind: "spotlight", rect: markedRect, shape: "rounded", live: false });
    setCard("Mark Ayah", "Saved — you can always find your place again from here.", 2);
    await sleepInterruptible(DWELL_LONG_MS);
    if (cancelledRef.current) return;

    // Step 3 — scroll back to the top (reverse of step 2's scroll)
    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    setCard("Back to the Top", "Scrolling back up to the top of the page.", 3);
    await sleep(POST_ACTION_PAUSE_MS);
    if (cancelledRef.current) return;
    await animateScrollTo(0, cancelledRef, null);
    if (cancelledRef.current) return;
    await sleep(POST_ACTION_PAUSE_MS);
    if (cancelledRef.current) return;

    // Step 4 — tap Mutoon
    await tapNavStep({
      selector: '[data-tour-id="/mutoon"]',
      step: 4,
      title: "Mutoon",
      text: "Classical texts for the student of knowledge, laid out page by page.",
    });
    if (cancelledRef.current) return;

    // Step 5 — tap Thikr
    await tapNavStep({
      selector: '[data-tour-id="/athkar"]',
      step: 5,
      title: "Thikr",
      text: "Morning and evening remembrances, with translations and repetition counts.",
    });
    if (cancelledRef.current) return;

    // Step 6 — tap Library
    await tapNavStep({
      selector: '[data-tour-id="/my-kitab"]',
      step: 6,
      title: "Library",
      text: "Your personal library — upload your own PDFs and search within them.",
    });
    if (cancelledRef.current) return;

    // Step 7 — tap Search
    await tapNavStep({
      selector: '[data-tour-id="/search"]',
      step: 7,
      title: "Search",
      text: "Search the Qur'an, Mutoon, and Hadith by topic or keyword.",
      thenSelector: ".search-input",
      thenTitle: "Search",
      thenText: 'Type here to search — try a concept like "patience".',
    });
    if (cancelledRef.current) return;

    // Step 8 — tap Settings
    await tapNavStep({
      selector: '[data-tour-id="/settings"]',
      step: 8,
      title: "Settings",
      text: "Your reciter, font sizes, theme, and reading preferences.",
    });
    if (cancelledRef.current) return;

    // Step 9 — Done
    setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
    setCard(
      "You're All Set",
      "That's everything — enjoy exploring My Kitab. You can start this tour again anytime from the Home screen.",
      9
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
              <span className="tour-card-progress">{textShown.step != null ? `${textShown.step} / 9` : ""}</span>
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
