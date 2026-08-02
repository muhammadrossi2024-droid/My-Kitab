import { useEffect, useRef, useState } from "react";
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

export default function GuidedTour({ onDone }) {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const navigate = useNavigate();
  const location = useLocation();
  const [steps] = useState(buildSteps);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const cleanupWatchRef = useRef(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

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
  // Place the card on whichever side of the target has more room — below it
  // when the target sits in the top half of the screen, above it otherwise
  // (nav bar items live at the very bottom, so the card must go above them).
  const cardBelow = step.kind === "spotlight" && rect && rect.top < window.innerHeight / 2;

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
          className={"tour-card" + (step.kind === "center" ? " tour-card-center" : "")}
          style={
            step.kind === "spotlight"
              ? cardBelow
                ? { top: rect.bottom + 34 }
                : { bottom: window.innerHeight - rect.top + 34 }
              : undefined
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
