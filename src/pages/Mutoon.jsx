import { Link } from "react-router-dom";
import { Library } from "lucide-react";
import { mutoonBooks } from "../data/mutoon/index.js";
import { useSettings } from "../context/SettingsContext.jsx";
import SectionHero from "../components/SectionHero.jsx";

export default function Mutoon() {
  const { lastMutoonRead } = useSettings();
  const lastMutoonBook =
    lastMutoonRead && mutoonBooks.find((b) => b.id === lastMutoonRead.bookId);

  return (
    <div>
      <SectionHero
        icon={Library}
        image="/hero-mutoon.jpg"
        imagePosition="center 42%"
        title="Mutoon"
        description="Classical texts for the student of knowledge (متون طالب العلم)."
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row-label">Continue Reading</div>
        {lastMutoonRead && lastMutoonBook ? (
          <>
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
          </>
        ) : (
          <p className="form-row-desc" style={{ marginTop: 2, marginBottom: 0 }}>
            Nothing saved yet. Open any book and tap "🔖 Mark as last read" on any point to save
            your place — it'll show up here so you can jump straight back to it.
          </p>
        )}
      </div>

      <ul className="surah-list mutoon-book-list">
        {mutoonBooks.map((book) => (
          <li key={book.id}>
            {book.available ? (
              <Link className="surah-list-item mutoon-book-item" to={`/mutoon/${book.id}`}>
                <span className="surah-meta">
                  <div className="surah-name-en">{book.titleTransliteration}</div>
                  <div className="surah-name-sub">{book.titleEnglish}</div>
                </span>
                <span className="surah-arabic-name">{book.titleArabic}</span>
              </Link>
            ) : (
              <div
                className="surah-list-item mutoon-book-item"
                style={{ opacity: 0.55, cursor: "default" }}
              >
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
    </div>
  );
}
