import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "../context/PremiumContext.jsx";
import { useIntro } from "../context/IntroContext.jsx";

// Wraps a route that's Premium-only (My Library, My Duas, Quran Page
// View). Non-Premium visitors never see the gated page's content — the
// shared full-page Premium screen (PremiumOfferScreen.jsx) opens on top
// instead. Declining it (the X) steps back out of the route entirely,
// rather than leaving them stranded on a blank page. Claiming Premium from
// inside the screen needs nothing special here — isPremiumUser flipping
// true just re-runs this effect and falls through to rendering `children`.
//
// The Premium Tour (see tours/premiumTourScript.js) is the one deliberate
// exception: it's meant to walk a non-Premium user through these exact
// pages for real, so the gate stands down for as long as that tour is on
// screen — `activeTour` reverts to null the instant the tour ends/is
// skipped, so real gating resumes immediately after.
export default function PremiumGate({ children }) {
  const { isPremiumUser, openPremiumOffer, closePremiumOffer } = usePremium();
  const { activeTour } = useIntro();
  const navigate = useNavigate();
  const bypassed = isPremiumUser || activeTour === "premium";

  useEffect(() => {
    if (bypassed) return;
    openPremiumOffer({ onDecline: () => navigate(-1) });
    return () => closePremiumOffer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bypassed]);

  if (!bypassed) return null;
  return children;
}
