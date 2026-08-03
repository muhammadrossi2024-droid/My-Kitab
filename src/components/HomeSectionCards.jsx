import { Link } from "react-router-dom";
import { BookOpen, Folder, Library as MutoonIcon } from "lucide-react";
import PrayingHandsIcon from "./PrayingHandsIcon.jsx";
import { usePremium } from "../context/PremiumContext.jsx";

const SECTIONS = [
  {
    key: "quran",
    to: "/surahs",
    title: "Quran",
    desc: "Arabic text with English translation.",
    icon: BookOpen,
    color: "var(--card-quran)",
  },
  {
    key: "mutoon",
    to: "/mutoon",
    title: "Mutoon",
    desc: "Classical texts for the student of knowledge.",
    icon: MutoonIcon,
    color: "var(--card-mutoon)",
  },
  {
    key: "thikr",
    to: "/athkar",
    title: "Thikr",
    desc: "Morning and evening supplications.",
    icon: PrayingHandsIcon,
    color: "var(--card-dhikr)",
  },
  {
    key: "library",
    to: "/my-kitab",
    title: "My Library",
    desc: "Your personal collection of Islamic knowledge.",
    icon: Folder,
    color: "var(--card-library)",
  },
];

// Home screen's entry point into the app's four main sections. Plain
// background + a section-tinted border. Once Premium is switched on (see
// PremiumPromoBox at the bottom of Home), every card's border turns gold
// instead — the border-color/box-shadow transition on .home-section-card
// is what makes that read as a reveal rather than an instant swap, and the
// per-card transition-delay below staggers that reveal into a small
// left-to-right cascade instead of all four flipping at once.
export default function HomeSectionCards() {
  const { isPremiumUser } = usePremium();

  return (
    <div className="home-section-grid">
      {SECTIONS.map((section, i) => {
        const Icon = section.icon;
        return (
          <Link
            key={section.key}
            to={section.to}
            className={"home-section-card" + (isPremiumUser ? " premium-active" : "")}
            style={{ "--card-color": section.color, transitionDelay: `${i * 70}ms` }}
          >
            <div className="home-section-card-icon-badge">
              <Icon className="home-section-card-icon" strokeWidth={2} />
            </div>
            <div className="home-section-card-title">{section.title}</div>
            <p className="home-section-card-desc">{section.desc}</p>
          </Link>
        );
      })}
    </div>
  );
}
