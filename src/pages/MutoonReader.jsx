import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import BackToTopButton from "../components/BackToTopButton.jsx";

const bookModules = import.meta.glob("../data/mutoon/*.json");

// A paragraph is either a plain string / {arabic} object, or a numbered
// list — { type: "list", lead, items: [{label, arabic}], trailing }, used
// wherever the matn itself enumerates a set of points (the four masail,
// the pillars of Islam/Iman, etc.) instead of running prose.
function isListParagraph(p) {
  return p && typeof p === "object" && p.type === "list";
}

function plainText(p) {
  return typeof p === "string" ? p : p.arabic;
}

function Paragraph({ p, fontSize }) {
  if (isListParagraph(p)) {
    return (
      <div className="mutoon-list">
        {p.lead && (
          <p className="ayah-arabic mutoon-list-lead" style={{ fontSize }}>
            {p.lead}
          </p>
        )}
        {p.items.map((point, i) => (
          <div className="mutoon-list-item" key={i}>
            <span className="ayah-number-badge mutoon-list-badge">{point.label}</span>
            <p className="ayah-arabic" style={{ fontSize }}>
              {point.arabic}
            </p>
          </div>
        ))}
        {p.trailing && (
          <p className="ayah-arabic mutoon-list-trailing" style={{ fontSize }}>
            {p.trailing}
          </p>
        )}
      </div>
    );
  }
  return (
    <p className="ayah-arabic" style={{ fontSize }}>
      {plainText(p)}
    </p>
  );
}

export default function MutoonReader() {
  const { bookId } = useParams();
  const { settings, lastMutoonRead, setLastMutoonRead } = useSettings();
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("text"); // "text" | "verses"
  const [justMarkedSection, setJustMarkedSection] = useState(null);

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

  // Jump straight to a section anchor when arriving via a "Resume" link.
  useEffect(() => {
    if (!book) return;
    const hash = window.location.hash;
    if (hash.startsWith("#section-")) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [book]);

  function handleMarkLastRead(section) {
    setLastMutoonRead(bookId, section.number, section.heading);
    setJustMarkedSection(section.number);
    setTimeout(() => setJustMarkedSection(null), 2000);
  }

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
        <div className="mutoon-book" key="full-text">
          {(book.bismillah || book.intro || book.introParagraphs) && (
            <div className="mutoon-page">
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
                  <Paragraph key={i} p={para} fontSize={settings.arabicFontSize} />
                ))}
            </div>
          )}
          {book.sections.map((section) => {
            const justMarked = justMarkedSection === section.number;
            const isLastRead =
              lastMutoonRead &&
              lastMutoonRead.bookId === bookId &&
              lastMutoonRead.sectionNumber === section.number;
            return (
              <div
                className={"mutoon-page" + (isLastRead ? " mutoon-page-last-read" : "")}
                id={`section-${section.number}`}
                key={section.number}
              >
                <span className="ayah-number-badge">{section.heading || section.number}</span>
                {section.paragraphs ? (
                  section.paragraphs.map((para, i) => (
                    <Paragraph key={i} p={para} fontSize={settings.arabicFontSize} />
                  ))
                ) : (
                  <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                    {section.arabic}
                  </p>
                )}
                {section.englishTranslation && (
                  <p
                    className="ayah-translation"
                    style={{ fontSize: settings.translationFontSize }}
                  >
                    {section.englishTranslation}
                  </p>
                )}
                <button
                  className={"btn mark-last-read-btn mutoon-page-mark-btn" + (justMarked ? " marked" : "")}
                  onClick={() => handleMarkLastRead(section)}
                >
                  {justMarked ? "✓ Marked" : "🔖 Mark as last read"}
                </button>
              </div>
            );
          })}
          {book.closing && (
            <div className="mutoon-page">
              <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                {book.closing}
              </p>
            </div>
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

      <BackToTopButton />
    </div>
  );
}
