import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "../context/PremiumContext.jsx";

// Wraps a route that's Premium-only (currently just My Library). Non-
// Premium visitors never see the gated page's content — the shared
// full-page Premium screen (PremiumOfferScreen.jsx) opens on top instead.
// Declining it (the X) steps back out of the route entirely, rather than
// leaving them stranded on a blank page. Claiming Premium from inside the
// screen needs nothing special here — isPremiumUser flipping true just
// re-runs this effect and falls through to rendering `children`.
export default function PremiumGate({ children }) {
  const { isPremiumUser, openPremiumOffer, closePremiumOffer } = usePremium();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPremiumUser) return;
    openPremiumOffer({ onDecline: () => navigate(-1) });
    return () => closePremiumOffer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremiumUser]);

  if (!isPremiumUser) return null;
  return children;
}
