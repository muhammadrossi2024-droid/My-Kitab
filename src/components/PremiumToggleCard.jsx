import { Crown } from "lucide-react";
import { usePremium } from "../context/PremiumContext.jsx";

// Manual on/off switch for Premium, shown on Home. Premium has no real
// payment backend yet, so this is the direct way to flip it (in addition
// to the "Claim Free Premium" CTA on the full-page screen itself) —
// mainly for testing the gate: turning it off is what makes My Library
// and Quran's note button show PremiumOfferScreen again the next time
// either is used; turning it on bypasses both immediately, same as
// actually claiming it there.
export default function PremiumToggleCard() {
  const { isPremiumUser, setIsPremiumUser } = usePremium();

  return (
    <div className="card premium-toggle-card">
      <div className="premium-toggle-row">
        <div className="premium-toggle-icon">
          <Crown size={18} strokeWidth={2} />
        </div>
        <div className="premium-toggle-text">
          <div className="form-row-label">Premium</div>
          <p className="form-row-desc">
            {isPremiumUser
              ? "Premium is on — My Library and Quran notes are unlocked."
              : "Premium is off — opening a Premium feature shows the upgrade screen."}
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={isPremiumUser}
            onChange={() => setIsPremiumUser(!isPremiumUser)}
            aria-label={isPremiumUser ? "Turn Premium off" : "Turn Premium on"}
          />
          <span className="switch-track" />
        </label>
      </div>
    </div>
  );
}
