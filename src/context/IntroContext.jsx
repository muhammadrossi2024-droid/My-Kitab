import { createContext, useContext, useState } from "react";

const IntroContext = createContext(null);

// The splash is a purely cosmetic branding beat that plays on every fresh
// load (see SplashScreen.jsx / App.jsx) — unrelated to the guided tours.
//
// `activeTour` replaces the old plain `showTour` boolean now that there are
// two tours sharing one engine (see components/GuidedTour.jsx): "home" only
// ever runs when a user explicitly starts it (Home screen's tour card), and
// "premium" is auto-launched by App.jsx right when Premium is newly
// activated (see PremiumContext's justActivatedPremium) — neither has any
// other persisted "have they seen it" state to track, just "is one open
// right now, and which one".
export function IntroProvider({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTour, setActiveTour] = useState(null); // null | "home" | "premium"

  const dismissSplash = () => setShowSplash(false);
  const startTour = () => setActiveTour("home");
  const startPremiumTour = () => setActiveTour("premium");
  const dismissTour = () => setActiveTour(null);

  const value = {
    showSplash,
    dismissSplash,
    activeTour,
    showTour: activeTour != null,
    startTour,
    startPremiumTour,
    dismissTour,
  };
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}

export function useIntro() {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error("useIntro must be used within IntroProvider");
  return ctx;
}
