import { Link } from "react-router-dom";
import { mutoonBooks } from "../data/mutoon/index.js";

export default function Mutoon() {
  return (
    <div>
      <h1>Mutoon</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Classical texts for the student of knowledge (متون طالب العلم).
      </p>
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
