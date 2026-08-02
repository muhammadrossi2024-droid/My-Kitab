import { createContext, useContext, useState } from "react";

const IntroContext = createContext(null);

// Drives the splash -> guided tour shown on every fresh page load (no
// "seen it once" persistence — it's intentionally shown on every refresh),
// plus lets Settings replay it on demand mid-session (see Settings.jsx).
export function IntroProvider({ children }) {
  const [showIntro, setShowIntro] = useState(true);
  const [stage, setStage] = useState("splash"); // "splash" | "tour"

  const advanceToTour = () => setStage("tour");

  const dismissIntro = () => setShowIntro(false);

  const restartIntro = () => {
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
