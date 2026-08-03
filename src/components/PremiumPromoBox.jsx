import { useEffect, useRef, useState } from "react";
import { Crown, Check } from "lucide-react";
import { usePremium } from "../context/PremiumContext.jsx";

// Single luxury promo box shown once, at the very bottom of the Home
// screen — deliberately black/gold and unrelated to the app's own theme
// tokens, so it reads as a distinct "special" moment rather than another
// themed card. The price strikethrough + "FREE" reveal plays once, the
// first time the box scrolls into view (IntersectionObserver below),
// never again after that for this mount. The CTA is a real on/off toggle
// (premium has no paywall yet, so there's nothing to gate) — turning it on
// is what makes every card on Home pick up a gold outline; see
// HomeSectionCards.jsx.
export default function PremiumPromoBox() {
  const boxRef = useRef(null);
  const [inView, setInView] = useState(false);
  const { isPremiumUser, setIsPremiumUser } = usePremium();

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleToggle() {
    console.log(`[premium-promo] ${isPremiumUser ? "disable" : "claim"} Premium clicked`);
    setIsPremiumUser(!isPremiumUser);
  }

  return (
    <div className="premium-promo-wrap" ref={boxRef}>
      <div className="premium-promo">
        <Crown className="premium-promo-icon" size={22} strokeWidth={1.75} />

        <h2 className="premium-promo-title">
          Go <span className="premium-promo-title-gold">Premium</span>
        </h2>

        <div className="premium-promo-divider" />

        <div className="premium-promo-prices">
          <span className="premium-promo-price">
            £2.50<span className="premium-promo-price-unit">/week</span>
            <span className={"premium-promo-price-line" + (inView ? " animate" : "")} />
          </span>
          <span className="premium-promo-price">
            £20<span className="premium-promo-price-unit">/year</span>
            <span
              className={"premium-promo-price-line premium-promo-price-line-2" + (inView ? " animate" : "")}
            />
          </span>
        </div>

        <div className={"premium-promo-free" + (inView ? " animate" : "")}>FREE</div>

        <button
          type="button"
          className={"premium-promo-cta" + (isPremiumUser ? " active" : "")}
          onClick={handleToggle}
        >
          {isPremiumUser ? (
            <>
              <Check size={16} strokeWidth={3} />
              Premium Active — Tap to Turn Off
            </>
          ) : (
            "Claim Free Premium"
          )}
        </button>
      </div>
    </div>
  );
}
