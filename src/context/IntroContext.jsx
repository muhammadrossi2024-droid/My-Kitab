import { createContext, useContext, useRef, useState } from "react";

const IntroContext = createContext(null);

const TOUR_SEEN_KEY = "quran-app:tour-seen";

function loadTourSeen() {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — the tour just
    // shows again next time, which is a fine fallback.
  }
}

// Drives the splash -> guided tour sequence. The splash always plays on
// every fresh load (see SplashScreen.jsx) — only the tour is gated: it runs
// once, the first time this browser has ever seen it, and either finishing
// it (Done) or Skipping it marks it seen so every later refresh goes
// straight from splash into the app. Settings' "Replay welcome guide"
// (restartIntro) deliberately bypasses that check via forceTourRef, since
// it's an explicit request to see it again regardless of the stored flag.
export function IntroProvider({ children }) {
  const [showIntro, setShowIntro] = useState(true);
  const [stage, setStage] = useState("splash"); // "splash" | "tour"
  const forceTourRef = useRef(false);

  const advanceToTour = () => {
    if (!forceTourRef.current && loadTourSeen()) {
      setShowIntro(false);
      return;
    }
    setStage("tour");
  };

  const dismissIntro = () => {
    markTourSeen();
    forceTourRef.current = false;
    setShowIntro(false);
  };

  const restartIntro = () => {
    forceTourRef.current = true;
    setStage("splash");
    setShowIntro(true);
  };

  const value = { showIntro, stage, advanceToTour, dismissIntro, restartIntro };
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}

export function useIntro() {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error("useIntro must be used within IntroProvider");
  return ctx;
}
