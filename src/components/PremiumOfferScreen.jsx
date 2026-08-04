import { useEffect, useState } from "react";
import { X, Crown, NotebookPen, Tag, FileText, Mic2 } from "lucide-react";
import { usePremium } from "../context/PremiumContext.jsx";

const FEATURES = [
  {
    icon: NotebookPen,
    title: "Note-Taking on the Quran",
    desc: "Flip any verse to write a personal note, tag it — by topic or theme — and save it for later.",
  },
  {
    icon: Tag,
    title: "Organized Note Storage",
    desc: "Notes are automatically organized into albums inside My Library, so they're easy to revisit and browse by tag.",
  },
  {
    icon: FileText,
    title: "Upload & Annotate Your Own PDFs",
    desc: "Upload your own PDFs and documents, add personal notes and tags the same way, and access them anytime in My Library.",
  },
  {
    icon: Mic2,
    title: "More Reciters",
    badge: "Coming Soon",
    desc: "A wider selection of Quran reciters is on its way for Premium members.",
  },
];

// The single, shared full-page Premium upsell — replaces the old promo
// card entirely. Mounted once at the app root (see App.jsx) and shown/
// hidden purely from PremiumContext's `offer` state, so every trigger
// point (first login, the My Library gate, Quran's note button) opens
// this exact same screen rather than each keeping its own copy.
export default function PremiumOfferScreen() {
  const { isPremiumUser, showPremiumOffer, offerConfig, closePremiumOffer, setIsPremiumUser } =
    usePremium();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!showPremiumOffer) {
      setAnimate(false);
      return;
    }
    // Small delay so the strike/reveal reads as an animation rather than
    // something that already happened by the time the screen is visible.
    const timer = setTimeout(() => setAnimate(true), 250);
    return () => clearTimeout(timer);
  }, [showPremiumOffer]);

  if (!showPremiumOffer || isPremiumUser) return null;

  function handleDecline() {
    offerConfig?.onDecline?.();
    closePremiumOffer();
  }

  function handleClaim() {
    setIsPremiumUser(true);
    closePremiumOffer();
  }

  return (
    <div className="premium-screen">
      <button
        type="button"
        className="premium-screen-close"
        onClick={handleDecline}
        aria-label="Close"
      >
        <X size={22} strokeWidth={2.25} />
      </button>

      <div className="premium-screen-scroll">
        <div className="premium-screen-hero">
          <div className="premium-screen-hero-badge">
            <Crown size={26} strokeWidth={1.75} />
          </div>
          <h1 className="premium-screen-title">Unlock Premium</h1>
          <p className="premium-screen-subtitle">
            Everything you need to study, note, and organize your Islamic learning — free while
            Premium is on us.
          </p>
        </div>

        <div className="premium-screen-features">
          {FEATURES.map((f) => (
            <div className="premium-screen-feature" key={f.title}>
              <div className="premium-screen-feature-icon">
                <f.icon size={20} strokeWidth={2} />
              </div>
              <div className="premium-screen-feature-text">
                <div className="premium-screen-feature-title">
                  {f.title}
                  {f.badge && <span className="premium-screen-badge">{f.badge}</span>}
                </div>
                <p className="premium-screen-feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="premium-screen-pricing">
          <div className="premium-screen-prices">
            <span className="premium-screen-price">
              £2.50<span className="premium-screen-price-unit">/month</span>
              <span className={"premium-screen-price-line" + (animate ? " animate" : "")} />
            </span>
            <span className="premium-screen-price">
              £20<span className="premium-screen-price-unit">/year</span>
              <span
                className={
                  "premium-screen-price-line premium-screen-price-line-2" + (animate ? " animate" : "")
                }
              />
            </span>
          </div>

          <div className={"premium-screen-free" + (animate ? " animate" : "")}>FREE</div>

          <button type="button" className="premium-screen-cta" onClick={handleClaim}>
            Claim Free Premium
          </button>

          <p className="premium-screen-finetext">
            No payment required — Premium is free during our launch.
          </p>
        </div>
      </div>
    </div>
  );
}
