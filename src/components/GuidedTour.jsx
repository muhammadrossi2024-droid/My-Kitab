import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import { useNavVisibility } from "../context/NavVisibilityContext.jsx";

// The generic engine behind every guided tour in the app (see
// src/tours/homeTourScript.js and premiumTourScript.js for the actual step
// sequences). It drives the app itself rather than just narrating it:
// scripts click real elements (a genuine `el.click()`, not a simulated
// coordinate tap) and scroll the real page, so navigation and side effects
// are the real thing, not a mock. A script is an async function that
// receives this file's `api` (below) and drives its own sequence of steps
// with it — this file owns none of the step content, only the shared
// mechanics: finding elements, spotlighting them, pausing for Next,
// animating scroll, and rendering the card/spotlight/ripple UI.

const FIND_TIMEOUT_MS = 4000;
const FIND_POLL_MS = 100;
const TEXT_FADE_MS = 150;
const TAP_RIPPLE_MS = 480;
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
// a specific element among several matches rather than just the first.
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
// distance (clamped to a generous min/max) specifically so a multi-element
// scroll reads as visibly passing each one, not a jump-cut.
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

export default function GuidedTour({ script, totalSteps, onDone }) {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const navigate = useNavigate();
  const { lock: lockNav, unlock: unlockNav, show: showNav } = useNavVisibility();

  // What's on screen right now — driven imperatively by the running script
  // via the `api` below, not derived from a step list, since a tour is a
  // live script rather than a series of "wait for the user to click Next"
  // states.
  const [display, setDisplay] = useState({ kind: "center", rect: null, shape: "circle", live: false });
  const [cardText, setCardText] = useState({ title: "Welcome", text: "", step: null, key: 0 });
  const [tapEffect, setTapEffect] = useState(null);
  const [isFinal, setIsFinal] = useState(false);
  // Whether the tour is currently parked at a step boundary, waiting for the
  // user to press Next — the Next button is only clickable while this is true.
  const [waitingForNext, setWaitingForNext] = useState(false);

  const cancelledRef = useRef(false);
  const advanceRef = useRef(null); // resolves the current "waiting for Next" pause, if any
  const tapIdRef = useRef(0);
  const cardKeyRef = useRef(0);
  const cardRef = useRef(null);
  const [cardPos, setCardPos] = useState(null);

  // Never resolves on its own — only a Next press (or Skip cancelling the
  // tour) calls advanceRef.current() to resolve it. This is what makes every
  // stop point manual instead of a timed auto-advance.
  function waitForNextPress() {
    return new Promise((resolve) => {
      if (cancelledRef.current) {
        resolve();
        return;
      }
      setWaitingForNext(true);
      advanceRef.current = () => {
        advanceRef.current = null;
        setWaitingForNext(false);
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
  // stale text), then holds until Next is pressed. Returns the measured
  // rect, or null if cancelled/not found. `scrollIntoView` is for targets
  // that aren't guaranteed to already be on screen (most nav-icon-style
  // steps don't need it — the bottom nav is always visible).
  async function ringAndPause(el, shape, title, text, step, scrollIntoView = false) {
    const rect = await settleAndMeasure(el, { scrollIntoView });
    if (cancelledRef.current) return null;
    setDisplay({ kind: "spotlight", rect, shape, live: false });
    if (title != null) setCard(title, text, step);
    await waitForNextPress();
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

  // The common shape for "find an element, ring + pause, tap it, let it
  // navigate" — used for every plain nav-icon-style step.
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
      await waitForNextPress();
    }
  }

  useEffect(() => {
    // React 18 StrictMode double-invokes this effect in dev (mount → cleanup
    // → mount again) to surface missing-cleanup bugs. `cancelledRef` is a
    // ref, so it survives that cycle unless explicitly reset here — without
    // this line, StrictMode's first cleanup permanently flips it to `true`,
    // the second (real) mount's script sees "cancelled" on its very first
    // check, and the tour dies silently after the first Next press with no
    // visible error. Resetting it at the top of setup, every time setup
    // runs, is what makes the second invocation a genuinely fresh start.
    cancelledRef.current = false;

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

    const api = {
      setDisplay,
      setCard,
      setIsFinal,
      waitForNextPress,
      waitForSelector: (selector, timeoutMs) => waitForSelector(selector, cancelledRef, timeoutMs),
      waitForNthSelector: (selector, index, timeoutMs) =>
        waitForNthSelector(selector, index, cancelledRef, timeoutMs),
      settleAndMeasure,
      ringAndPause,
      tapAndSettle,
      tapNavStep,
      animateScrollTo: (targetY, onFrame) => animateScrollTo(targetY, cancelledRef, onFrame),
      sleep,
      cancelledRef,
    };

    (async () => {
      lockNav();
      await script(api);
      showNav();
      unlockNav();
    })();

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

  function handleNext() {
    advanceRef.current?.();
  }

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
                {textShown.step != null ? `${textShown.step} / ${totalSteps}` : ""}
              </span>
              {isFinal ? (
                <button className="btn btn-primary tour-next-btn" onClick={handleDone}>
                  Done
                </button>
              ) : (
                <button
                  className="btn btn-primary tour-next-btn"
                  onClick={handleNext}
                  disabled={!waitingForNext}
                >
                  Next
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
