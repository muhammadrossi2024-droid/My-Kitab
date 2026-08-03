import { createContext, useContext, useState } from "react";

const IntroContext = createContext(null);

// The splash is a purely cosmetic branding beat that plays on every fresh
// load (see SplashScreen.jsx / App.jsx) — unrelated to the guided tour.
// The tour only ever runs when a user explicitly starts it — from the Home
// screen's tour card, or Settings' replay button — so there's no persisted
// "have they seen it" state to track anymore, just "is it open right now".
export function IntroProvider({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [showTour, setShowTour] = useState(false);

  const dismissSplash = () => setShowSplash(false);
  const startTour = () => setShowTour(true);
  const dismissTour = () => setShowTour(false);

  const value = { showSplash, dismissSplash, showTour, startTour, dismissTour };
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}

export function useIntro() {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error("useIntro must be used within IntroProvider");
  return ctx;
}
