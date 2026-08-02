import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import { links } from "./Navbar.jsx";

const REVEAL_STAGGER_MS = 450;

// Keyed by route so copy stays attached to the right tab even if `links` in
// Navbar.jsx gets reordered — only a renamed/removed route needs a copy edit.
const TAB_BLURBS = {
  "/my-kitab": "Your personal library. Upload your own PDFs and search only within them — try adding one and searching a word from it.",
  "/surahs": "The full Qur'an, with Arabic text and English translation. Try opening a surah and tapping a verse to hear it recited.",
  "/mutoon": "Classical texts for the student of knowledge, laid out page by page. Try opening a book and swiping through a lesson.",
  "/athkar": "Morning and evening remembrances, with translations and repetition counts. Try running through the morning athkar and tracking your reps.",
  "/search": "Search the Qur'an, Mutoon, and Hadith by topic or keyword, in English or Arabic. Try searching a concept like \"patience\" or \"الصبر\".",
  "/settings": "Your reciter, font sizes, theme, and reading preferences. Try switching between light and dark mode.",
};

function buildMessages() {
  const messages = [
    { text: "Assalamu alaikum! Welcome to My Kitab — here's a quick tour of what each tab does." },
  ];
  for (const link of links) {
    messages.push({ tab: link, text: TAB_BLURBS[link.to] || `The ${link.label} tab.` });
  }
  return messages;
}

export default function AssistantIntro({ onDone }) {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const [messages] = useState(buildMessages);
  const [revealed, setRevealed] = useState(1);

  useEffect(() => {
    if (revealed >= messages.length) return;
    const timer = setTimeout(() => setRevealed((n) => n + 1), REVEAL_STAGGER_MS);
    return () => clearTimeout(timer);
  }, [revealed, messages.length]);

  return (
    <div className="assistant-intro">
      <div className="assistant-intro-scroll">
        {messages.slice(0, revealed).map((m, i) => (
          <div className="chat-row" key={i}>
            <img src={logoSrc} alt="" className="chat-avatar" />
            <div className="chat-bubble">
              {m.tab ? (
                <>
                  <Link to={m.tab.to} className="chat-tab-link" onClick={onDone}>
                    {m.tab.label}
                  </Link>{" "}
                  {"— "}
                  {m.text}
                </>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary assistant-intro-start" onClick={onDone}>
        Start exploring
      </button>
    </div>
  );
}
