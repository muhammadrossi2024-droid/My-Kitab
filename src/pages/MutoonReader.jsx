import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import BackToTopButton from "../components/BackToTopButton.jsx";
import ArabicText from "../components/ArabicText.jsx";

// Flattens a matn into the sequence of "pages" a reader swipes through.
// Each front-matter unit (bismillah / intro / each intro paragraph) and each
// section paragraph gets its own page — finer-grained than one page per
// section — plus an optional closing page.
function buildPages(book) {
  const pages = [];

  const introUnits = [];
  if (book.bismillah) introUnits.push({ kind: "bismillah" });
  if (book.intro) introUnits.push({ kind: "intro" });
  if (book.introParagraphs) {
    book.introParagraphs.forEach((para) => introUnits.push({ kind: "para", para }));
  }
  introUnits.forEach((unit, i) => {
    pages.push({ key: `intro-${i}`, type: "intro", unit });
  });

  for (const section of book.sections) {
    const paragraphs = section.paragraphs || [section.arabic];
    paragraphs.forEach((para, i) => {
      pages.push({ key: `section-${section.number}-${i}`, type: "section", section, para });
    });
  }

  if (book.closing) {
    pages.push({ key: "closing", type: "closing" });
  }

  return pages;
}

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
            <ArabicText text={p.lead} />
          </p>
        )}
        {p.items.map((point, i) => (
          <div className="mutoon-list-item" key={i}>
            <span className="ayah-number-badge mutoon-list-badge">{point.label}</span>
            <p className="ayah-arabic" style={{ fontSize }}>
              <ArabicText text={point.arabic} />
            </p>
          </div>
        ))}
        {p.trailing && (
          <p className="ayah-arabic mutoon-list-trailing" style={{ fontSize }}>
            <ArabicText text={p.trailing} />
          </p>
        )}
      </div>
    );
  }
  return (
    <p className="ayah-arabic" style={{ fontSize }}>
      <ArabicText text={plainText(p)} />
    </p>
  );
}

export default function MutoonReader() {
  const { bookId } = useParams();
  const [searchParams] = useSearchParams();
  const { settings, lastMutoonRead, setLastMutoonRead } = useSettings();
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);
  const initialTab = searchParams.get("tab");
  const [mode, setMode] = useState(
    initialTab === "hadith" || initialTab === "verses" ? initialTab : "text"
  ); // "text" | "verses" | "hadith"
  const [justMarkedPage, setJustMarkedPage] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageAnim, setPageAnim] = useState(null); // "next" | "prev" | null
  const swipeStartRef = useRef(null); // {x, y} | null — only tracked for touch/pen pointers

  const pages = useMemo(() => (book ? buildPages(book) : []), [book]);

  useEffect(() => {
    setBook(null);
    setError(null);
    setMode("text");
    setPageIndex(0);
    setPageAnim(null);
    const loader = bookModules[`../data/mutoon/${bookId}.json`];
    if (!loader) {
      setError("not found");
      return;
    }
    loader()
      .then((mod) => setBook(mod.default))
      .catch((err) => setError(err.message));
  }, [bookId]);

  // Jump straight to a page when arriving via a "Resume" link.
  useEffect(() => {
    if (!book) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const idx = pages.findIndex((p) => p.key === hash);
    if (idx !== -1) setPageIndex(idx);
  }, [book, pages]);

  function goToPage(nextIndex, direction) {
    if (nextIndex < 0 || nextIndex >= pages.length) return;
    setPageAnim(direction);
    setPageIndex(nextIndex);
  }

  function handlePointerDown(e) {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp(e) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      goToPage(pageIndex + 1, "next");
    } else {
      goToPage(pageIndex - 1, "prev");
    }
  }

  function pageHeadingFor(page) {
    if (page.type === "intro") return "Introduction";
    if (page.type === "closing") return "Closing";
    return page.section.heading || page.section.number;
  }

  function handleMarkLastRead(page) {
    setLastMutoonRead(bookId, page.key, pageHeadingFor(page));
    setJustMarkedPage(page.key);
    setTimeout(() => setJustMarkedPage(null), 2000);
  }

  function renderPageContent(page) {
    if (!page) return null;
    const justMarked = justMarkedPage === page.key;
    const markButton = (
      <button
        className={"btn mark-last-read-btn mutoon-page-mark-btn" + (justMarked ? " marked" : "")}
        onClick={() => handleMarkLastRead(page)}
      >
        {justMarked ? "✓ Marked" : "🔖 Mark as last read"}
      </button>
    );

    if (page.type === "intro") {
      const { unit } = page;
      return (
        <>
          {unit.kind === "bismillah" && (
            <p
              className="ayah-arabic"
              style={{ textAlign: "center", fontSize: settings.arabicFontSize }}
            >
              {book.bismillah}
            </p>
          )}
          {unit.kind === "intro" && (
            <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
              {book.intro}
            </p>
          )}
          {unit.kind === "para" && <Paragraph p={unit.para} fontSize={settings.arabicFontSize} />}
          {markButton}
        </>
      );
    }
    if (page.type === "section") {
      const { section, para } = page;
      return (
        <>
          <span className="ayah-number-badge">{section.heading || section.number}</span>
          <Paragraph p={para} fontSize={settings.arabicFontSize} />
          {markButton}
        </>
      );
    }
    if (page.type === "closing") {
      return (
        <>
          <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
            {book.closing}
          </p>
          {markButton}
        </>
      );
    }
    return null;
  }

  if (error) {
    return <div className="empty-state">This text isn't available yet.</div>;
  }
  if (!book) {
    return <div className="loading-state">Loading…</div>;
  }

  const currentPage = pages[pageIndex];
  const currentIsLastRead =
    currentPage &&
    lastMutoonRead &&
    lastMutoonRead.bookId === bookId &&
    lastMutoonRead.pageKey === currentPage.key;

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
          Read the full text, or jump straight to the Qur'an verses and hadith it references.
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
            Verses ({book.quranVerses.length})
          </button>
          {book.hadiths && book.hadiths.length > 0 && (
            <button
              className={"segmented-control-btn" + (mode === "hadith" ? " active" : "")}
              onClick={() => setMode("hadith")}
            >
              Hadith ({book.hadiths.length})
            </button>
          )}
        </div>
      </div>

      {mode === "text" ? (
        <>
          <div
            className="mutoon-pager"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            <div
              key={currentPage?.key}
              className={
                "mutoon-page" +
                (pageAnim === "next" ? " mutoon-page-anim-next" : "") +
                (pageAnim === "prev" ? " mutoon-page-anim-prev" : "") +
                (currentIsLastRead ? " mutoon-page-last-read" : "")
              }
              id={currentPage?.key}
            >
              {renderPageContent(currentPage)}
            </div>
          </div>
          <div className="mutoon-pager-controls">
            <button
              className="mutoon-pager-btn"
              onClick={() => goToPage(pageIndex - 1, "prev")}
              disabled={pageIndex === 0}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="mutoon-pager-indicator">
              Page {pageIndex + 1} of {pages.length}
            </span>
            <button
              className="mutoon-pager-btn"
              onClick={() => goToPage(pageIndex + 1, "next")}
              disabled={pageIndex === pages.length - 1}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </>
      ) : mode === "hadith" ? (
        <div className="card" key="hadith">
          {book.hadiths.map((h, i) => (
            <div className="ayah-block" key={i}>
              <span className="ayah-number-badge">Hadith {i + 1}</span>
              {h.arabic && (
                <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                  {h.arabic}
                </p>
              )}
              <p className="ayah-translation" style={{ fontSize: settings.translationFontSize }}>
                {h.translation}
              </p>
              {h.source && (
                <p className="hadith-source">{h.source}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" key="verses">
          {book.quranVerses.map((v) => (
            <div className="ayah-block" key={v.ref}>
              <span className="ayah-number-badge">
                {v.surahNameTransliteration} {v.ref}
              </span>
              <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                <ArabicText text={v.arabic} />
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
