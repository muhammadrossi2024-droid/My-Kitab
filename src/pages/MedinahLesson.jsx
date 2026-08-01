import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";

const bookModules = import.meta.glob("../data/medinah/*.json");

export default function MedinahLesson() {
  const { bookId, lessonNumber } = useParams();
  const { settings } = useSettings();
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

  const number = Number(lessonNumber);
  const lesson = book.lessons.find((l) => l.number === number);
  if (!lesson) {
    return <div className="empty-state">This lesson isn't available yet.</div>;
  }

  const prevLesson = book.lessons.find((l) => l.number === number - 1);
  const nextLesson = book.lessons.find((l) => l.number === number + 1);

  return (
    <div>
      <div className="reader-header">
        <h1 style={{ margin: "8px 0 4px" }}>{lesson.title}</h1>
        <div style={{ color: "var(--text-muted)" }}>{book.title.english}</div>
      </div>

      <div className="card">
        <div className="form-row-label">Lesson</div>
        {lesson.content && lesson.content.length > 0 ? (
          lesson.content.map((para, i) => (
            <p key={i} className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
              {para}
            </p>
          ))
        ) : (
          <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
            Lesson content coming soon.
          </p>
        )}
      </div>

      <div className="card">
        <div className="form-row-label">Vocabulary</div>
        {lesson.vocabulary && lesson.vocabulary.length > 0 ? (
          <div className="vocab-list">
            {lesson.vocabulary.map((word, i) => (
              <div className="vocab-row" key={i}>
                <span className="vocab-arabic">{word.arabic}</span>
                <span className="vocab-english">
                  {word.english}
                  {word.transliteration && (
                    <span className="vocab-transliteration"> ({word.transliteration})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
            Vocabulary coming soon.
          </p>
        )}
      </div>

      <div className="reader-nav">
        {prevLesson ? (
          <Link className="btn" to={`/medinah/${bookId}/${prevLesson.number}`}>
            ← {prevLesson.title}
          </Link>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <Link className="btn" to={`/medinah/${bookId}/${nextLesson.number}`}>
            {nextLesson.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
