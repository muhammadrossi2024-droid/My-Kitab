import { useState } from "react";
import { Sparkles, X } from "lucide-react";

const MONTHLY_PRICE = "£2.50";
const YEARLY_PRICE = "£20";
// £2.50 × 12 = £30/yr paid monthly, vs £20/yr — the yearly plan's saving.
const YEARLY_SAVINGS_PCT = 33;

// One modal shape shared by every section (Quran, Mutoon, Thikr, My
// Library) — only the icon, accent color, and copy change per section, so
// premium always feels like the same offer instead of four different ones.
// Subscribe buttons are UI-only for now: no payment provider is wired up
// yet, so a tap just shows an inline "coming soon" note per plan.
export default function PremiumModal({ open, onClose, icon: Icon, color, title, description, perks }) {
  const [clickedPlan, setClickedPlan] = useState(null);

  if (!open) return null;

  function handleSubscribe(plan) {
    // Placeholder until the payment provider/backend is in place.
    console.log(`[premium] subscribe clicked — section="${title}" plan="${plan}"`);
    setClickedPlan(plan);
  }

  return (
    <div className="premium-modal-backdrop" onClick={onClose}>
      <div
        className="premium-modal"
        style={{ "--card-color": color }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} Premium`}
      >
        <button className="premium-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2} />
        </button>

        <div className="premium-modal-preview">
          {Icon && <Icon className="premium-modal-preview-icon" strokeWidth={1.75} />}
          <span className="premium-modal-preview-label">{title} Premium Preview</span>
        </div>

        <div className="premium-modal-body">
          <div className="premium-modal-title">Upgrade {title}</div>
          <p className="premium-modal-desc">{description}</p>

          {perks && perks.length > 0 && (
            <ul className="premium-modal-perks">
              {perks.map((perk) => (
                <li key={perk}>
                  <Sparkles size={14} strokeWidth={2} />
                  {perk}
                </li>
              ))}
            </ul>
          )}

          <div className="premium-modal-plans">
            <div className="premium-modal-plan">
              <div className="premium-modal-plan-price">{MONTHLY_PRICE}</div>
              <div className="premium-modal-plan-period">per month</div>
              <button className="btn btn-primary" onClick={() => handleSubscribe("monthly")}>
                Subscribe
              </button>
            </div>
            <div className="premium-modal-plan featured">
              <div className="premium-modal-plan-badge">Save {YEARLY_SAVINGS_PCT}%</div>
              <div className="premium-modal-plan-price">{YEARLY_PRICE}</div>
              <div className="premium-modal-plan-period">per year</div>
              <button className="btn btn-primary" onClick={() => handleSubscribe("yearly")}>
                Subscribe
              </button>
            </div>
          </div>

          {clickedPlan && (
            <p className="premium-modal-note">
              Subscriptions aren't live yet — check back soon to upgrade with the {clickedPlan} plan.
            </p>
          )}

          <button className="premium-modal-later" onClick={onClose}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
