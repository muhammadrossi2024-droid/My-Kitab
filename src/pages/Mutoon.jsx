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
        imageZoom={1.7}
        imageFocus="0% 50%"
        fadeMid="28%"
        fadeEnd="65%"
        blurMid="18%"
        blurEnd="42%"
        contentMaxWidth="30%"
        title="Mutoon"
        description="Classical texts for the student of knowledge (متون طالب العلم)."
      />

      {lastMutoonRead && lastMutoonBook && (
        <Link
          className="btn btn-primary resume-reading-link"
          to={`/mutoon/${lastMutoonRead.bookId}#${lastMutoonRead.pageKey}`}
        >
          Resume Reading
        </Link>
      )}

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
