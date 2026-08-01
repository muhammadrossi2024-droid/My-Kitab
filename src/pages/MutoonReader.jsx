import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";

const bookModules = import.meta.glob("../data/mutoon/*.json");

export default function MutoonReader() {
  const { bookId } = useParams();
  const { settings } = useSettings();
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("text"); // "text" | "verses"

  useEffect(() => {
    setBook(null);
    setError(null);
    setMode("text");
    const loader = bookModules[`../data/mutoon/${bookId}.json`];
    if (!loader) {
      setError("not found");
      return;
    }
    loader()
      .then((mod) => setBook(mod.default))
      .catch((err) => setError(err.message));
  }, [bookId]);

  if (error) {
    return <div className="empty-state">This text isn't available yet.</div>;
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
        <h1 style={{ margin: "8px 0 4px" }}>{book.title.transliteration}</h1>
        <div style={{ color: "var(--text-muted)" }}>{book.title.english}</div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 6 }}>
          {book.author.transliteration}
          {book.author.deathYearHijri ? ` (d. ${book.author.deathYearHijri} AH)` : ""}
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 18, marginBottom: 8 }}>
          Read the full text or jump straight to the Qur'an verses it references.
        </p>
        <div className="segmented-control" style={{ margin: "0 auto" }}>
          <button
            className={"segmented-control-btn" + (mode === "text" ? " active" : "")}
            onClick={() => setMode("text")}
          >
            Full Text
          </button>
          <button
            className={"segmented-control-btn" + (mode === "verses" ? " active" : "")}
            onClick={() => setMode("verses")}
          >
            Qur'an Verses Used ({book.quranVerses.length})
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <div className="card" key="full-text">
          {book.bismillah && (
            <p
              className="ayah-arabic"
              style={{ textAlign: "center", fontSize: settings.arabicFontSize }}
            >
              {book.bismillah}
            </p>
          )}
          {book.intro && (
            <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
              {book.intro}
            </p>
          )}
          {book.introParagraphs &&
            book.introParagraphs.map((para, i) => (
              <p key={i} className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                {para.arabic}
              </p>
            ))}
          {book.sections.map((section) => (
            <div className="ayah-block" key={section.number}>
              <span className="ayah-number-badge">{section.heading || section.number}</span>
              <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                {section.arabic}
              </p>
              {section.englishTranslation && (
                <p
                  className="ayah-translation"
                  style={{ fontSize: settings.translationFontSize }}
                >
                  {section.englishTranslation}
                </p>
              )}
            </div>
          ))}
          {book.closing && (
            <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize, marginTop: 20 }}>
              {book.closing}
            </p>
          )}
        </div>
      ) : (
        <div className="card" key="verses">
          {book.quranVerses.map((v) => (
            <div className="ayah-block" key={v.ref}>
              <span className="ayah-number-badge">
                {v.surahNameTransliteration} {v.ref}
              </span>
              <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                {v.arabic}
              </p>
              <p className="ayah-translation" style={{ fontSize: settings.translationFontSize }}>
                {v.translation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
