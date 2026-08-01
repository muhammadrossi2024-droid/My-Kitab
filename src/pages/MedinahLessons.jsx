import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const bookModules = import.meta.glob("../data/medinah/*.json");

export default function MedinahLessons() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setBook(null);
    setError(null);
    const loader = bookModules[`../data/medinah/${bookId}.json`];
    if (!loader) {
      setError("not found");
      return;
    }
    loader()
      .then((mod) => setBook(mod.default))
      .catch((err) => setError(err.message));
  }, [bookId]);

  if (error) {
    return <div className="empty-state">This book isn't available yet.</div>;
  }
  if (!book) {
    return <div className="loading-state">Loading…</div>;
  }

  return (
    <div>
      <div className="reader-header">
        <div className="surah-arabic-name" style={{ fontSize: "2rem" }}>
          {book.title.arabic}
        </div>
        <h1 style={{ margin: "8px 0 4px" }}>{book.title.english}</h1>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 6 }}>
          {book.author}
          {book.source ? ` · ${book.source}` : ""}
        </div>
      </div>

      <div className="card">
        {book.lessons.length === 0 ? (
          <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
            Lessons coming soon.
          </p>
        ) : (
          <ul className="surah-list">
            {book.lessons.map((lesson) => (
              <li key={lesson.number}>
                <Link
                  className="surah-list-item"
                  to={`/medinah/${bookId}/${lesson.number}`}
                >
                  <span className="surah-meta">
                    <div className="surah-name-en">{lesson.title}</div>
                    <div className="surah-name-sub">
                      {lesson.vocabulary.length} vocabulary{" "}
                      {lesson.vocabulary.length === 1 ? "word" : "words"}
                    </div>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
