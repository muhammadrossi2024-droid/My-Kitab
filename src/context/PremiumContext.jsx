import { createContext, useContext, useEffect, useState } from "react";

const PremiumContext = createContext(null);
const STORAGE_KEY = "mykitab-premium-active";

// Real, working toggle state for now (premium is free — there's nothing to
// gate), but kept behind one context so swapping this for actual
// subscription status later (server-verified, tied to the signed-in user,
// etc.) only means changing what happens inside this provider — every
// consumer (the promo box's toggle, the section cards' gold outline)
// already just reads/writes through usePremium() and needs no changes.
export function PremiumProvider({ children }) {
  const [isPremiumUser, setIsPremiumUser] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isPremiumUser));
    } catch {
      // Storage unavailable (private browsing, etc.) — state still works
      // for the session, it just won't survive a reload.
    }
  }, [isPremiumUser]);

  return (
    <PremiumContext.Provider value={{ isPremiumUser, setIsPremiumUser }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within a PremiumProvider");
  return ctx;
}
