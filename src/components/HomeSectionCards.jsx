import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Folder, Library as MutoonIcon, Sparkles } from "lucide-react";
import PrayingHandsIcon from "./PrayingHandsIcon.jsx";
import PremiumModal from "./PremiumModal.jsx";
import useIsPremiumUser from "../hooks/useIsPremiumUser.js";

const SECTIONS = [
  {
    key: "quran",
    to: "/surahs",
    title: "Quran",
    desc: "Arabic text with English translation.",
    icon: BookOpen,
    color: "var(--card-quran)",
    premium: {
      description:
        "Go deeper in the Quran with tafsir notes alongside every ayah, a choice of reciters for audio playback, and offline downloads for reading anywhere.",
      perks: ["Tafsir notes on every ayah", "Multiple reciters", "Offline audio downloads"],
    },
  },
  {
    key: "mutoon",
    to: "/mutoon",
    title: "Mutoon",
    desc: "Classical texts for the student of knowledge.",
    icon: MutoonIcon,
    color: "var(--card-mutoon)",
    premium: {
      description:
        "Study classical texts with audio explanations from qualified teachers, progress tracking across every matn, and printable study sheets.",
      perks: ["Audio explanations", "Progress tracking", "Printable study sheets"],
    },
  },
  {
    key: "thikr",
    to: "/athkar",
    title: "Thikr",
    desc: "Morning and evening supplications.",
    icon: PrayingHandsIcon,
    color: "var(--card-dhikr)",
    premium: {
      description:
        "Build a consistent thikr habit with custom reminder schedules, extra dua collections beyond morning and evening, and a daily streak tracker.",
      perks: ["Custom reminder schedules", "Extra dua collections", "Daily streak tracker"],
    },
  },
  {
    key: "library",
    to: "/my-kitab",
    title: "My Library",
    desc: "Your personal collection of Islamic knowledge.",
    icon: Folder,
    color: "var(--card-library)",
    premium: {
      description:
        "Grow your personal library with unlimited PDF uploads, smart search that looks inside every book, and automatic cloud backup.",
      perks: ["Unlimited PDF uploads", "Search inside your books", "Cloud backup"],
    },
  },
];

// Home screen's entry point into the app's four main sections. Plain
// background + a section-tinted border (not a filled/shaded card) so the
// color itself carries the section identity; the small Premium badge in
// the corner opens a shared PremiumModal without navigating the card.
export default function HomeSectionCards() {
  const isPremiumUser = useIsPremiumUser();
  const [openSection, setOpenSection] = useState(null);
  const active = SECTIONS.find((s) => s.key === openSection) || null;

  return (
    <>
      <div className="home-section-grid">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.key}
              to={section.to}
              className="home-section-card"
              style={{ "--card-color": section.color }}
            >
              {!isPremiumUser && (
                <button
                  type="button"
                  className="home-section-card-premium-badge"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenSection(section.key);
                  }}
                >
                  <Sparkles size={11} strokeWidth={2.5} />
                  Premium
                </button>
              )}
              <div className="home-section-card-icon-badge">
                <Icon className="home-section-card-icon" strokeWidth={2} />
              </div>
              <div className="home-section-card-title">{section.title}</div>
              <p className="home-section-card-desc">{section.desc}</p>
            </Link>
          );
        })}
      </div>

      <PremiumModal
        open={active !== null}
        onClose={() => setOpenSection(null)}
        icon={active?.icon}
        color={active?.color}
        title={active?.title}
        description={active?.premium.description}
        perks={active?.premium.perks}
      />
    </>
  );
}
