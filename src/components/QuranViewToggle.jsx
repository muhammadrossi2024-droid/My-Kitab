import { Crown } from "lucide-react";
import { usePremium } from "../context/PremiumContext.jsx";
import { useIntro } from "../context/IntroContext.jsx";

// Shared Scroll View / Page View switch — rendered at the top of both
// SurahReader (Scroll View) and MushafPage (Page View) so it's visible and
// reachable from either mode. Page View is Premium-only: non-Premium users
// still see it (so they know it exists) but tapping it opens the shared
// full-page Premium screen instead of calling onSelect. The caller only
// ever receives onSelect("page") when the user is actually allowed there
// — or when the Premium Tour is previewing this exact step for a
// non-Premium user (see tours/premiumTourScript.js), which needs the real
// switch to happen rather than being interrupted by the upsell screen.
export default function QuranViewToggle({ mode, onSelect }) {
  const { isPremiumUser, openPremiumOffer } = usePremium();
  const { activeTour } = useIntro();

  function handleClick(target) {
    if (target === mode) return;
    if (target === "page" && !isPremiumUser && activeTour !== "premium") {
      openPremiumOffer();
      return;
    }
    onSelect(target);
  }

  return (
    <div className="quran-view-toggle" role="group" aria-label="Reading mode">
      <button
        type="button"
        className={"quran-view-toggle-btn" + (mode === "scroll" ? " active" : "")}
        onClick={() => handleClick("scroll")}
      >
        Scroll View
      </button>
      <button
        type="button"
        className={"quran-view-toggle-btn" + (mode === "page" ? " active" : "")}
        onClick={() => handleClick("page")}
      >
        Page View
        {!isPremiumUser && (
          <span className="quran-view-premium-pill">
            <Crown size={11} strokeWidth={2.5} />
            Premium
          </span>
        )}
      </button>
    </div>
  );
}
