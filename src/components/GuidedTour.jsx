import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import { links } from "./Navbar.jsx";

// Same copy as before — only the presentation changed (chat bubbles -> a
// spotlight tour). Keyed by route so it survives `links` being reordered.
const TAB_BLURBS = {
  "/my-kitab": "Your personal library. Upload your own PDFs and search only within them — try adding one and searching a word from it.",
  "/surahs": "The full Qur'an, with Arabic text and English translation. Try opening a surah and tapping a verse to hear it recited.",
  "/mutoon": "Classical texts for the student of knowledge, laid out page by page. Try opening a book and swiping through a lesson.",
  "/athkar": "Morning and evening remembrances, with translations and repetition counts. Try running through the morning athkar and tracking your reps.",
  "/search": "Search the Qur'an, Mutoon, and Hadith by topic or keyword, in English or Arabic. Try searching a concept like \"patience\" or \"الصبر\".",
  "/settings": "Your reciter, font sizes, theme, and reading preferences. Try switching between light and dark mode.",
};

function buildSteps() {
  const steps = [
    {
      kind: "center",
      title: "Welcome",
      text: "Assalamu alaikum! Welcome to My Kitab — let's take a quick tour of what everything does.",
    },
  ];
  for (const link of links) {
    steps.push({
      kind: "spotlight",
      shape: "circle",
      selector: `[data-tour-id="${link.to}"]`,
      title: link.label,
      text: TAB_BLURBS[link.to] || `The ${link.label} tab.`,
    });
  }
  steps.push({
    kind: "spotlight",
    shape: "rounded",
    route: "/surahs",
    selector: '[data-tour="continue-reading"]',
    title: "Continue Reading",
    text: "Once you've marked a page, it shows up here so you can jump straight back to where you left off.",
  });
  steps.push({
    kind: "spotlight",
    shape: "rounded",
    route: "/surah/1",
    selector: ".mark-last-read-btn",
    title: "Mark as last read",
    text: "Tap this under any ayah to save your place — it's what powers Continue Reading.",
  });
  return steps;
}

const FIND_TIMEOUT_MS = 3000;
const FIND_POLL_MS = 100;

// Waits for the target's layout to actually settle — into view, fonts
// loaded, a couple of frames past that — before reporting its bounds, so the
// spotlight never snaps to a stale pre-layout position (the root cause of it
// landing on "empty space" for elements below the fold or behind a
// still-loading web font).
// Resolves after the next two paints, like a standard double-rAF wait — but
// races it against a plain timer so a backgrounded/hidden tab (where Chrome
// suspends rAF callbacks entirely) can't hang this forever; either signal is
// equally fine here since all we need is "give layout a moment to settle".
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

async function settleAndMeasure(el, { scrollIntoView }) {
  if (scrollIntoView) {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }
  if (document.fonts && document.fonts.status !== "loaded") {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // Proceed with whatever's loaded — a missing webfont shouldn't block
      // the tour forever.
    }
  }
  await nextPaint();
  return el.getBoundingClientRect();
}

const CARD_MAX_WIDTH = 360;
const CARD_MARGIN = 16;
const CARD_GAP = 24; // gap between the card and its target/screen edge

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export default function GuidedTour({ onDone }) {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const navigate = useNavigate();
  const location = useLocation();
  const [steps] = useState(buildSteps);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const cleanupWatchRef = useRef(null);
  const cardRef = useRef(null);
  const [cardPos, setCardPos] = useState(null); // { left, top, width } in px, or null while unmeasured
  const [rectStepIndex, setRectStepIndex] = useState(stepIndex); // which step `rect` belongs to

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // `rect` is only cleared for real inside the polling useEffect below, which
  // — being a passive effect — doesn't run until after the browser has
  // already painted once. Without this, the step right after a Next click
  // would paint one frame with the NEW step's title/text but the OLD step's
  // target position, since stepIndex updates synchronously but rect doesn't.
  // This is React's documented "adjust state during render" pattern: it
  // resets rect before this render is ever committed, so that stale frame
  // never paints at all.
  if (stepIndex !== rectStepIndex) {
    setRectStepIndex(stepIndex);
    setRect(null);
    setCardPos(null);
  }

  function goNext() {
    if (isLast) onDone();
    else setStepIndex((i) => i + 1);
  }

  // Find (and, if needed, navigate to) this step's target, then measure it
  // only once its layout has actually settled.
  useEffect(() => {
    if (step.kind !== "spotlight") {
      setRect(null);
      return;
    }
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
      return; // effect reruns once the route actually changes
    }

    let cancelled = false;
    setRect(null);
    cleanupWatchRef.current?.();
    cleanupWatchRef.current = null;
    const startedAt = Date.now();

    // Once found and measured, keep watching for any further layout shift
    // (late-loading content, orientation change) and re-measure in place —
    // this never re-triggers the scroll/settle sequence, just tracks it.
    function watch(el) {
      const remeasure = () => {
        if (cancelled) return;
        setRect(el.getBoundingClientRect());
      };
      const ro = new ResizeObserver(remeasure);
      ro.observe(el);
      ro.observe(document.body);
      window.addEventListener("resize", remeasure);
      cleanupWatchRef.current = () => {
        ro.disconnect();
        window.removeEventListener("resize", remeasure);
      };
    }

    function poll() {
      if (cancelled) return;
      const el = document.querySelector(step.selector);
      if (el) {
        settleAndMeasure(el, { scrollIntoView: !!step.route }).then((r) => {
          if (cancelled) return;
          setRect(r);
          watch(el);
        });
        return;
      }
      if (Date.now() - startedAt > FIND_TIMEOUT_MS) {
        // Target never showed up (e.g. no reading progress yet to spotlight)
        // — don't get the tour stuck, just move on.
        goNext();
        return;
      }
      setTimeout(poll, FIND_POLL_MS);
    }
    poll();

    return () => {
      cancelled = true;
      cleanupWatchRef.current?.();
      cleanupWatchRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, location.pathname]);

  const showCard = step.kind === "center" || !!rect;
  // Preferred side: below the target when it sits in the top half of the
  // screen, above it otherwise (nav bar items live at the very bottom, so
  // the card must go above them) — used for the arrow direction and as the
  // card's starting anchor before clamping.
  const cardBelow = step.kind === "spotlight" && rect && rect.top < window.innerHeight / 2;

  // Measure the card's real (width-dependent) height synchronously before
  // the browser paints, then clamp both axes to the actual viewport — so it
  // is correctly positioned on the very first visible frame, never rendered
  // off-screen and corrected a moment later.
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
    if (step.kind === "center" || !rect) {
      left = (vw - width) / 2;
      top = (vh - height) / 2;
    } else {
      const preferredCenterX = rect.left + rect.width / 2;
      left = preferredCenterX - width / 2;
      top = cardBelow ? rect.bottom + CARD_GAP : rect.top - CARD_GAP - height;
    }

    left = clamp(left, CARD_MARGIN, vw - width - CARD_MARGIN);
    top = clamp(top, CARD_MARGIN, vh - height - CARD_MARGIN);

    setCardPos({ left, top, width });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCard, step, rect, cardBelow]);

  return (
    <div className="tour-overlay">
      {(step.kind === "center" || !rect) && <div className="tour-backdrop" />}
      {step.kind === "spotlight" && rect && (
        <>
          <div
            className={"tour-spotlight" + (step.shape === "circle" ? " circle" : " rounded")}
            style={{
              top: rect.top - 8,
              left: rect.left - 8,
              width: rect.width + 16,
              height: rect.height + 16,
            }}
          />
          <div
            className={"tour-arrow" + (cardBelow ? " up" : " down")}
            style={{
              left: rect.left + rect.width / 2,
              top: cardBelow ? rect.bottom + 10 : rect.top - 18,
            }}
          />
        </>
      )}

      {showCard && (
        <div
          ref={cardRef}
          className="tour-card"
          style={
            cardPos
              ? { left: cardPos.left, top: cardPos.top, width: cardPos.width, visibility: "visible" }
              : // First pass: laid out with its real width so height can be
                // measured above, but not yet visible — avoids any flash at
                // a wrong (unclamped) position.
                { left: 0, top: 0, width: Math.min(CARD_MAX_WIDTH, window.innerWidth - CARD_MARGIN * 2), visibility: "hidden" }
          }
        >
          <img src={logoSrc} alt="" className="chat-avatar tour-card-avatar" />
          <div className="tour-card-body">
            <div className="tour-card-title">{step.title}</div>
            <p className="tour-card-text">{step.text}</p>
            <div className="tour-card-actions">
              <span className="tour-card-progress">
                {stepIndex + 1} / {steps.length}
              </span>
              <button className="btn btn-primary tour-next-btn" onClick={goNext}>
                {isLast ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="tour-skip-btn" onClick={onDone}>
        <X className="tour-skip-icon" strokeWidth={2.5} />
        Skip
      </button>
    </div>
  );
}
