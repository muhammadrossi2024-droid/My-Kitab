import { createContext, useContext, useState } from "react";

const SEEN_KEY = "quran-app:seen-intro";

function loadShowIntro() {
  try {
    return localStorage.getItem(SEEN_KEY) !== "true";
  } catch {
    return true;
  }
}

const IntroContext = createContext(null);

// Drives the one-time splash -> assistant walkthrough shown on first app
// open, plus lets Settings replay it on demand (see Settings.jsx).
export function IntroProvider({ children }) {
  const [showIntro, setShowIntro] = useState(loadShowIntro);
  const [stage, setStage] = useState("splash");

  const advanceToChat = () => setStage("chat");

  const dismissIntro = () => {
    try {
      localStorage.setItem(SEEN_KEY, "true");
    } catch {
      // localStorage unavailable (e.g. private browsing) — the intro will
      // simply show again next load, which is an acceptable fallback.
    }
    setShowIntro(false);
  };

  const restartIntro = () => {
    setStage("splash");
    setShowIntro(true);
  };

  const value = { showIntro, stage, advanceToChat, dismissIntro, restartIntro };
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}

export function useIntro() {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error("useIntro must be used within IntroProvider");
  return ctx;
}
