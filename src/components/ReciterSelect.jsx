import { useState } from "react";
import { Crown } from "lucide-react";
import { reciters, getReciter, isPremiumReciter } from "../data/reciters.js";
import { usePremium } from "../context/PremiumContext.jsx";

// Drop-in replacement for the plain <select> reciter picker, used in
// Settings, SurahReader, and MushafPage. A native <select>'s <option>
// elements can't reliably be styled (no cross-browser way to put a purple
// "Premium" pill or border on one option), so Premium-gated reciters need
// this custom popover list instead — same backdrop/popover/list pattern
// already used for the ayah/page jump pickers, just with reciter rows.
export default function ReciterSelect({ value, onChange, label = "Reciter" }) {
  const [open, setOpen] = useState(false);
  const { isPremiumUser, openPremiumOffer } = usePremium();
  const current = getReciter(value);

  function handlePick(reciterId) {
    if (isPremiumReciter(reciterId) && !isPremiumUser) {
      setOpen(false);
      openPremiumOffer();
      return;
    }
    setOpen(false);
    onChange(reciterId);
  }

  return (
    <span className="reciter-select-wrap">
      <button
        type="button"
        className="reciter-select-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title={label}
      >
        {current.name} ▾
      </button>
      {open && (
        <>
          <div className="ayah-picker-backdrop" onClick={() => setOpen(false)} />
          <div className="ayah-picker-popover reciter-select-popover" role="dialog" aria-label={label}>
            <div className="ayah-picker-header">
              <span>{label}</span>
              <button className="ayah-picker-close" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="ayah-picker-scroll reciter-option-list">
              {reciters.map((r) => {
                const locked = r.premium && !isPremiumUser;
                return (
                  <button
                    type="button"
                    key={r.id}
                    className={
                      "reciter-option" +
                      (r.id === value ? " active" : "") +
                      (r.premium ? " reciter-option-premium" : "")
                    }
                    onClick={() => handlePick(r.id)}
                  >
                    <span>{r.name}</span>
                    {r.premium && (
                      <span className="premium-pill">
                        {locked && <Crown size={11} strokeWidth={2.5} />}
                        Premium
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </span>
  );
}
