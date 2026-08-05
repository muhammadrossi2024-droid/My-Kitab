import { createContext, useContext, useEffect, useState } from "react";

const PremiumContext = createContext(null);
const STORAGE_KEY = "mykitab-premium-active";

// Real, working toggle state for now (premium is free — there's nothing to
// gate), but kept behind one context so swapping this for actual
// subscription status later (server-verified, tied to the signed-in user,
// etc.) only means changing what happens inside this provider — every
// consumer already just reads/writes through usePremium() and needs no
// changes.
export function PremiumProvider({ children }) {
  const [isPremiumUser, setIsPremiumUserRaw] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Deliberately NOT persisted — this only needs to be true for the instant
  // it takes App.jsx to notice it and launch the Premium tour, then it's
  // cleared again. That's what makes "just activated" a real edge (fires
  // once per actual activation) rather than "isPremiumUser is currently
  // true" (which would replay the tour on every reload/login instead).
  const [justActivatedPremium, setJustActivatedPremium] = useState(false);

  // Same external signature every caller already uses (PremiumOfferScreen's
  // Claim CTA, PremiumToggleCard's dev switch) — turning Premium on through
  // either one now also flags the activation for the tour.
  function setIsPremiumUser(value) {
    setIsPremiumUserRaw(value);
    if (value) setJustActivatedPremium(true);
  }

  function clearJustActivatedPremium() {
    setJustActivatedPremium(false);
  }

  // The one shared full-page Premium screen (PremiumOfferScreen.jsx) is
  // mounted once at the app root and toggled from here, rather than each
  // trigger point (PremiumGate, the Quran note button, first login)
  // rendering its own copy. `offer` doubles as both "is it open" and
  // "what to do if the user declines it" — that differs per trigger (My
  // Library's gate needs to step back out of the route; the Quran note
  // button and first-login don't need to navigate anywhere on decline).
  const [offer, setOffer] = useState(null); // null | { onDecline?: () => void }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isPremiumUser));
    } catch {
      // Storage unavailable (private browsing, etc.) — state still works
      // for the session, it just won't survive a reload.
    }
  }, [isPremiumUser]);

  function openPremiumOffer(config = {}) {
    setOffer(config);
  }

  function closePremiumOffer() {
    setOffer(null);
  }

  const value = {
    isPremiumUser,
    setIsPremiumUser,
    justActivatedPremium,
    clearJustActivatedPremium,
    showPremiumOffer: offer !== null,
    offerConfig: offer,
    openPremiumOffer,
    closePremiumOffer,
  };

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within a PremiumProvider");
  return ctx;
}
