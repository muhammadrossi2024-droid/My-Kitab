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
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <div className="form-row-label">Continue Reading</div>
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
        <p className="form-row-desc" style={{ marginBottom: 12 }}>
          Classical texts for the student of knowledge (متون طالب العلم).
        </p>
        <ul className="surah-list">
          {mutoonBooks.map((book) => (
            <li key={book.id}>
              {book.available ? (
                <Link className="surah-list-item" to={`/mutoon/${book.id}`}>
                  <span className="surah-meta">
                    <div className="surah-name-en">{book.titleTransliteration}</div>
                    <div className="surah-name-sub">{book.titleEnglish}</div>
                  </span>
                  <span className="surah-arabic-name">{book.titleArabic}</span>
                </Link>
              ) : (
                <div className="surah-list-item" style={{ opacity: 0.55, cursor: "default" }}>
                  <span className="surah-meta">
                    <div className="surah-name-en">{book.titleTransliteration}</div>
                    <div className="surah-name-sub">{book.titleEnglish} · coming soon</div>
                  </span>
                  <span className="surah-arabic-name">{book.titleArabic}</span>
                </div>
              )}
            </li>
          ))}
        </ul>

        {lastMutoonRead && lastMutoonBook && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <div className="form-row-label">Continue Reading</div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: "2px 0 8px" }}>
              Updates automatically when you tap "Mark as last read" on any point.
            </p>
            <p className="form-row-desc" style={{ marginBottom: 12 }}>
              You left off at {lastMutoonBook.titleTransliteration}, {lastMutoonRead.sectionHeading}.
            </p>
            <Link
              className="btn btn-primary"
              to={`/mutoon/${lastMutoonRead.bookId}#section-${lastMutoonRead.sectionNumber}`}
            >
              Resume Reading
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
