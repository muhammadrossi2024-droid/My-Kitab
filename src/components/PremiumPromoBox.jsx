import { useEffect, useRef, useState } from "react";
import { Crown } from "lucide-react";

// Single luxury promo box shown once, at the very bottom of the Home
// screen — deliberately black/gold and unrelated to the app's own theme
// tokens, so it reads as a distinct "special" moment rather than another
// themed card. The price strikethrough + "FREE" reveal plays once, the
// first time the box scrolls into view (IntersectionObserver below),
// never again after that for this mount.
export default function PremiumPromoBox() {
  const boxRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [claimed, setClaimed] = useState(false);

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

  function handleClaim() {
    // Placeholder — premium has no real subscription/checkout yet, and is
    // free for everyone in the meantime, so there's nothing to charge.
    console.log("[premium-promo] Claim Free Premium clicked");
    setClaimed(true);
  }

  return (
    <div className="premium-promo-wrap" ref={boxRef}>
      <div className="premium-promo">
        <Crown className="premium-promo-icon" size={30} strokeWidth={1.75} />

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

        <p className="premium-promo-sub">Full access, on us — for a limited time.</p>

        {claimed ? (
          <p className="premium-promo-claimed">You're all set — enjoy full Premium access!</p>
        ) : (
          <button className="premium-promo-cta" onClick={handleClaim}>
            Claim Free Premium
          </button>
        )}
      </div>
    </div>
  );
}
