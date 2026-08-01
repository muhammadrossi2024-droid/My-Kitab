import { Link } from "react-router-dom";
import { medinahBooks } from "../data/medinah/index.js";

export default function MedinahBooks() {
  return (
    <div>
      <h1>Medinah Books</h1>
      <p style={{ color: "var(--text-muted)" }}>
        The Medinah Arabic course, lesson by lesson, with vocabulary for each lesson.
      </p>
      <ul className="surah-list mutoon-book-list">
        {medinahBooks.map((book) => (
          <li key={book.id}>
            {book.available ? (
              <Link className="surah-list-item mutoon-book-item" to={`/medinah/${book.id}`}>
                <span className="surah-meta">
                  <div className="surah-name-en">{book.titleEnglish}</div>
                </span>
                <span className="surah-arabic-name">{book.titleArabic}</span>
              </Link>
            ) : (
              <div
                className="surah-list-item mutoon-book-item"
                style={{ opacity: 0.55, cursor: "default" }}
              >
                <span className="surah-meta">
                  <div className="surah-name-en">{book.titleEnglish} · coming soon</div>
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
