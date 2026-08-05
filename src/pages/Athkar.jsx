import { Link } from "react-router-dom";
import { Sunrise, Sunset, Heart, Crown } from "lucide-react";
import SectionHero from "../components/SectionHero.jsx";
import PrayingHandsIcon from "../components/PrayingHandsIcon.jsx";
import { usePremium } from "../context/PremiumContext.jsx";

const SECTIONS = [
  {
    key: "morning",
    to: "/athkar/morning",
    title: "Morning Athkar",
    desc: "The full morning collection of supplications.",
    icon: Sunrise,
  },
  {
    key: "evening",
    to: "/athkar/evening",
    title: "Evening Athkar",
    desc: "The full evening collection of supplications.",
    icon: Sunset,
  },
];

export default function Athkar() {
  const { isPremiumUser, openPremiumOffer } = usePremium();

  return (
    <div>
      <SectionHero
        icon={PrayingHandsIcon}
        title="Athkar"
        description="Authentic morning and evening supplications, complete with English translation and source references."
      />

      <div className="home-section-grid">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.key}
              to={section.to}
              className="home-section-card"
              style={{ "--card-color": "var(--card-dhikr)" }}
            >
              <div className="home-section-card-icon-badge">
                <Icon className="home-section-card-icon" strokeWidth={2} />
              </div>
              <div className="home-section-card-title">{section.title}</div>
              <p className="home-section-card-desc">{section.desc}</p>
            </Link>
          );
        })}

        {isPremiumUser ? (
          <Link
            to="/athkar/my-duas"
            className="home-section-card"
            style={{ "--card-color": "var(--card-library)" }}
          >
            <div className="home-section-card-icon-badge">
              <Heart className="home-section-card-icon" strokeWidth={2} />
            </div>
            <div className="home-section-card-title">My Duas</div>
            <p className="home-section-card-desc">Your own custom duas, saved to your account.</p>
          </Link>
        ) : (
          <button
            type="button"
            className="home-section-card home-section-card-locked"
            style={{ "--card-color": "var(--card-library)" }}
            onClick={() => openPremiumOffer()}
          >
            <div className="home-section-card-icon-badge">
              <Heart className="home-section-card-icon" strokeWidth={2} />
            </div>
            <div className="home-section-card-title">My Duas</div>
            <p className="home-section-card-desc">Write and save your own custom duas.</p>
            <span className="premium-pill">
              <Crown size={11} strokeWidth={2.5} />
              Premium
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
