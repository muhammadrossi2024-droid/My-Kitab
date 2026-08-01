import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import { mutoonBooks } from "../data/mutoon/index.js";

export default function Home() {
  const { lastRead, lastMutoonRead } = useSettings();
  const [lastSurahMeta, setLastSurahMeta] = useState(null);
  const lastMutoonBook =
    lastMutoonRead && mutoonBooks.find((b) => b.id === lastMutoonRead.bookId);

  useEffect(() => {
    fetch("/data/surahs/index.json")
      .then((res) => res.json())
      .then((index) => {
        if (lastRead) {
          const meta = index.find((s) => s.number === lastRead.surah);
          if (meta) setLastSurahMeta(meta);
        }
      })
      .catch(() => {});
  }, [lastRead]);

  return (
    <div>
      <div className="card">
        <div className="form-row-label">The Noble Quran</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Read the Noble Qur'an with Arabic text and English translation, saved locally so it
          loads instantly.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" to="/surahs">
            Browse Surahs
          </Link>
          <Link className="btn" to="/settings">
            Settings
          </Link>
        </div>

        {lastRead && lastSurahMeta && (
          <div className="home-continue-block">
            <div className="home-continue-label">Continue Reading</div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: "2px 0 8px" }}>
              Updates automatically when you tap "Mark as last read" on any ayah.
            </p>
            <p className="form-row-desc" style={{ marginBottom: 12 }}>
              You left off at Surah {lastSurahMeta.transliteration}, verse {lastRead.ayah}.
            </p>
            <Link className="btn btn-primary" to={`/surah/${lastRead.surah}#ayah-${lastRead.ayah}`}>
              Resume Reading
            </Link>
          </div>
        )}
      </div>

      <div className="card">
        <div className="form-row-label">Mutoon</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Classical texts for the student of knowledge (متون طالب العلم).
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" to="/mutoon">
            Browse Mutoon
          </Link>
        </div>

        {lastMutoonRead && lastMutoonBook && (
          <div className="home-continue-block">
            <div className="home-continue-label">Continue Reading</div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: "2px 0 8px" }}>
              Updates automatically when you tap "Mark as last read" on any point.
            </p>
            <p className="form-row-desc" style={{ marginBottom: 12 }}>
              You left off at {lastMutoonBook.titleTransliteration}, {lastMutoonRead.pageHeading}.
            </p>
            <Link
              className="btn btn-primary"
              to={`/mutoon/${lastMutoonRead.bookId}#${lastMutoonRead.pageKey}`}
            >
              Resume Reading
            </Link>
          </div>
        )}
      </div>

      <div className="card">
        <div className="form-row-label">Medinah Book Vocabulary</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>Coming soon.</p>
      </div>

      <div className="card">
        <div className="form-row-label">Settings</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Adjust reciter, font size, theme, and other reading preferences.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" to="/settings">
            Open Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
