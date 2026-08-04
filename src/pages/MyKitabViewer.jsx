import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TextLayer } from "pdfjs-dist";
import { NotebookPen, X } from "lucide-react";
import { getPdf } from "../utils/myKitabDb.js";
import { openPdfDocument } from "../utils/pdfExtract.js";
import { listNotesBySourceKey } from "../utils/notesDb.js";
import NoteEditor from "../components/NoteEditor.jsx";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const HIGHLIGHT_WINDOW = 8; // text-layer spans considered together as one highlight run

// Render resolution: previously a flat `1.6 * devicePixelRatio` scale, which
// on an ordinary non-retina screen (dpr 1) rendered only ~1.12x the page's
// displayed CSS width — barely above 1:1, so it looked soft/"compressed"
// compared to the actual file, and turned visibly blocky under pinch-zoom.
// Instead, size the canvas relative to how large the page actually appears
// on screen: its real displayed width (matching .mykitab-page's own
// `width: min(600px, 88vw)`) times the device pixel ratio times a zoom
// headroom factor, so it stays sharp through a good chunk of pinch-zoom
// rather than just matching the page at rest. Capped so very high-DPI
// devices don't produce an unworkably large canvas.
const BASE_DISPLAY_WIDTH = 600; // px — matches .mykitab-page's CSS width cap
const ZOOM_HEADROOM = 1.5; // stay crisp through this much pinch-zoom before native-pixel softening
const MAX_RENDER_WIDTH = 3600; // px — safety ceiling on canvas size

function significantWords(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length >= 3);
}

// Shared by both the actual canvas render and the text-layer overlay, so
// the two always agree on exactly what size the page is displayed at.
function computeViewports(page, wrapEl) {
  const baseViewport = page.getViewport({ scale: 1 });
  const displayWidth = Math.min(BASE_DISPLAY_WIDTH, wrapEl?.clientWidth || BASE_DISPLAY_WIDTH);
  const displayViewport = page.getViewport({ scale: displayWidth / baseViewport.width });

  const dpr = window.devicePixelRatio || 1;
  const renderWidth = Math.min(displayWidth * dpr * ZOOM_HEADROOM, MAX_RENDER_WIDTH);
  const renderViewport = page.getViewport({ scale: renderWidth / baseViewport.width });

  return { displayViewport, renderViewport };
}

export default function MyKitabViewer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const targetPage = Number(searchParams.get("page")) || null;
  const targetQuery = searchParams.get("q") || null;

  const [record, setRecord] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [renderedSet, setRenderedSet] = useState(() => new Set());
  const [pageErrors, setPageErrors] = useState(() => new Map());
  const [zoom, setZoom] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [notesByRef, setNotesByRef] = useState(new Map());
  const [notePageOpen, setNotePageOpen] = useState(null); // page number, or null

  const canvasRefs = useRef([]);
  const pageWrapRefs = useRef([]);
  const renderedRef = useRef(new Set());
  const renderingRef = useRef(new Set());
  const highlightedRef = useRef(false);
  const unmountedRef = useRef(false);

  const pointers = useRef(new Map());
  const pinchStartDist = useRef(null);
  const pinchStartZoom = useRef(1);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRecord(null);
    setNotFound(false);
    setPdfDoc(null);
    setLoadError(null);
    renderedRef.current = new Set();
    renderingRef.current = new Set();
    highlightedRef.current = false;
    setRenderedSet(new Set());
    setPageErrors(new Map());
    canvasRefs.current = [];
    pageWrapRefs.current = [];

    getPdf(id).then((rec) => {
      if (cancelled) return;
      if (!rec) {
        setNotFound(true);
        return;
      }
      setRecord(rec);
    });
    setNotesByRef(new Map());
    setNotePageOpen(null);
    listNotesBySourceKey("library", id).then((map) => {
      if (!cancelled) setNotesByRef(map);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!record) return;
    let cancelled = false;
    let doc = null;
    record.blob
      .arrayBuffer()
      .then((buf) => openPdfDocument(buf))
      .then((pdf) => {
        if (cancelled) {
          pdf.destroy();
          return;
        }
        doc = pdf;
        setPdfDoc(pdf);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "This PDF couldn't be opened.");
      });
    return () => {
      cancelled = true;
      if (doc) doc.destroy();
    };
  }, [record]);

  const numPages = pdfDoc?.numPages || 0;

  async function renderPage(pageNumber) {
    if (!pdfDoc) return;
    const canvas = canvasRefs.current[pageNumber - 1];
    const wrapEl = pageWrapRefs.current[pageNumber - 1];
    if (!canvas) return;
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const { displayViewport, renderViewport } = computeViewports(page, wrapEl);
      canvas.width = Math.round(renderViewport.width);
      canvas.height = Math.round(renderViewport.height);
      canvas.style.width = `${displayViewport.width}px`;
      canvas.style.height = `${displayViewport.height}px`;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
      renderedRef.current.add(pageNumber);
      setRenderedSet(new Set(renderedRef.current));
    } catch (err) {
      // Rendering can be legitimately cancelled by unmount/navigation —
      // only surface a genuine failure, not that.
      if (unmountedRef.current) return;
      setPageErrors((prev) => new Map(prev).set(pageNumber, err.message || "couldn't be rendered"));
    }
  }

  async function ensurePageRendered(pageNumber) {
    if (renderedRef.current.has(pageNumber) || renderingRef.current.has(pageNumber)) return;
    renderingRef.current.add(pageNumber);
    try {
      await renderPage(pageNumber);
    } finally {
      renderingRef.current.delete(pageNumber);
    }
  }

  // Frees a page's canvas once it's scrolled well out of view — full-quality
  // canvases (see computeViewports) are large, so for a long PDF keeping
  // every visited page's canvas alive would keep growing memory use and
  // slow down scrolling. Reverting to the unrendered placeholder (see
  // .mykitab-page in index.css) re-renders cheaply if the user scrolls back.
  function unrenderPage(pageNumber) {
    const canvas = canvasRefs.current[pageNumber - 1];
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    renderedRef.current.delete(pageNumber);
    setRenderedSet(new Set(renderedRef.current));
  }

  // Virtualized rendering, via two separate observers with deliberately
  // different margins rather than one observer reacting to both directions
  // of the same boundary. With a single shared margin, a page sitting right
  // at that line would render, then immediately unrender, then re-render on
  // the tiniest scroll wobble — visibly stuttering right as it's supposed to
  // be settling in. Rendering eagerly (tight margin) but only freeing a page
  // once it's scrolled well past that (loose margin) gives a dead zone in
  // between where a page's state can't flap back and forth.
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    const renderObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) ensurePageRendered(Number(entry.target.dataset.page));
        }
      },
      { rootMargin: "900px 0px" }
    );
    const unrenderObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) unrenderPage(Number(entry.target.dataset.page));
        }
      },
      { rootMargin: "2400px 0px" }
    );
    pageWrapRefs.current.forEach((el) => {
      if (!el) return;
      renderObserver.observe(el);
      unrenderObserver.observe(el);
    });
    return () => {
      renderObserver.disconnect();
      unrenderObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, numPages]);

  function jumpToPage(pageNumber) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > numPages) return;
    const el = pageWrapRefs.current[pageNumber - 1];
    if (el) el.scrollIntoView({ block: "start" });
    ensurePageRendered(pageNumber);
  }

  function noteRefKeyFor(pageNumber) {
    return `${record.id}-page-${pageNumber}`;
  }

  function excerptForPage(pageNumber) {
    const text = record?.pages?.[pageNumber - 1]?.text || "";
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  }

  function handleNoteChange(pageNumber, note, deletedId) {
    setNotesByRef((prev) => {
      const next = new Map(prev);
      if (deletedId) next.delete(noteRefKeyFor(pageNumber));
      else next.set(noteRefKeyFor(pageNumber), note);
      return next;
    });
    setNotePageOpen(null);
  }

  function handleJumpSubmit(e) {
    e.preventDefault();
    jumpToPage(parseInt(pageInput, 10));
    setPageInput("");
  }

  // Deep link from a search result: jump to the page and highlight the match.
  useEffect(() => {
    if (!pdfDoc || !targetPage) return;
    const el = pageWrapRefs.current[targetPage - 1];
    if (el) el.scrollIntoView({ block: "start" });
    ensurePageRendered(targetPage).then(async () => {
      if (targetQuery && !highlightedRef.current) {
        highlightedRef.current = true;
        await highlightMatchOnPage(targetPage, targetQuery);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, targetPage, targetQuery]);

  async function highlightMatchOnPage(pageNumber, matchText) {
    if (!pdfDoc) return;
    const wrap = pageWrapRefs.current[pageNumber - 1];
    const textLayerEl = wrap?.querySelector(".mykitab-text-layer");
    if (!textLayerEl) return;

    const page = await pdfDoc.getPage(pageNumber);
    const { displayViewport } = computeViewports(page, wrap);
    const content = await page.getTextContent();

    textLayerEl.innerHTML = "";
    textLayerEl.style.width = `${displayViewport.width}px`;
    textLayerEl.style.height = `${displayViewport.height}px`;
    // pdf.js's TextLayer positions every span with CSS calc()/round() math
    // that reads this custom property from the container — without it every
    // span's position and font-size collapses to 0.
    textLayerEl.style.setProperty("--scale-factor", displayViewport.scale);
    const textLayer = new TextLayer({
      textContentSource: content,
      container: textLayerEl,
      viewport: displayViewport,
    });
    await textLayer.render();

    const words = significantWords(matchText);
    const divs = textLayer.textDivs;
    if (words.length === 0 || divs.length === 0) return;

    const spanWords = content.items.map((item) => significantWords(item.str || ""));
    let bestStart = -1;
    let bestScore = 0;
    for (let start = 0; start < divs.length; start++) {
      const covered = new Set();
      for (let j = start; j < Math.min(divs.length, start + HIGHLIGHT_WINDOW); j++) {
        for (const w of spanWords[j]) {
          if (words.includes(w)) covered.add(w);
        }
      }
      if (covered.size > bestScore) {
        bestScore = covered.size;
        bestStart = start;
      }
    }
    if (bestStart === -1) return;

    const end = Math.min(divs.length, bestStart + HIGHLIGHT_WINDOW);
    for (let i = bestStart; i < end; i++) {
      if (spanWords[i].some((w) => words.includes(w))) {
        divs[i].classList.add("mykitab-highlight");
      }
    }
    divs[bestStart]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function onPointerDown(e) {
    if (e.pointerType !== "touch") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      pinchStartDist.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      pinchStartZoom.current = zoom;
    }
  }

  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStartDist.current) {
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, pinchStartZoom.current * (dist / pinchStartDist.current))
      );
      setZoom(next);
    }
  }

  function onPointerEnd(e) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStartDist.current = null;
  }

  const header = (
    <div className="mykitab-viewer-header">
      <Link to="/my-kitab" className="mykitab-viewer-back">
        ‹ My Library
      </Link>
      {record && <div className="mykitab-viewer-title">{record.title}</div>}
      {numPages > 0 && (
        <form className="mykitab-jump-form" onSubmit={handleJumpSubmit}>
          <input
            type="number"
            min={1}
            max={numPages}
            className="mykitab-jump-input"
            placeholder={`Page (1–${numPages})`}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            aria-label="Jump to page"
          />
          <button type="submit" className="btn mykitab-jump-btn">
            Go
          </button>
        </form>
      )}
    </div>
  );

  if (notFound) {
    return (
      <div>
        {header}
        <div className="empty-state">This PDF isn't in your library anymore.</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        {header}
        <div className="empty-state">{loadError}</div>
      </div>
    );
  }

  if (!record || !pdfDoc) {
    return (
      <div>
        {header}
        <div className="loading-state">Opening PDF…</div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div
        className="mykitab-viewer-scroll"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div className="mykitab-viewer-zoom" style={{ transform: `scale(${zoom})` }}>
          {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={"mykitab-page" + (renderedSet.has(n) ? " rendered" : "")}
              data-page={n}
              ref={(el) => (pageWrapRefs.current[n - 1] = el)}
            >
              <canvas ref={(el) => (canvasRefs.current[n - 1] = el)} />
              <div className="mykitab-text-layer" />
              {pageErrors.has(n) && (
                <div className="mykitab-page-error">Page {n} {pageErrors.get(n)}</div>
              )}
              <button
                type="button"
                className={"mykitab-page-note-btn" + (notesByRef.has(noteRefKeyFor(n)) ? " has-note" : "")}
                onClick={() => setNotePageOpen(n)}
                aria-label={notesByRef.has(noteRefKeyFor(n)) ? "Edit note for this page" : "Add note for this page"}
                title={notesByRef.has(noteRefKeyFor(n)) ? "Edit note" : "Add note"}
              >
                <NotebookPen size={15} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {notePageOpen !== null && (
        <div className="confirm-dialog-backdrop" onClick={() => setNotePageOpen(null)}>
          <div
            className="note-popover-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`Note for page ${notePageOpen}`}
          >
            <div className="note-popover-header">
              <span>Page {notePageOpen}</span>
              <button
                type="button"
                className="note-popover-close"
                onClick={() => setNotePageOpen(null)}
                aria-label="Close"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <NoteEditor
              source="library"
              sourceKey={record.id}
              refKey={noteRefKeyFor(notePageOpen)}
              sourceLabel={`${record.title} — page ${notePageOpen}`}
              excerpt={excerptForPage(notePageOpen)}
              existing={notesByRef.get(noteRefKeyFor(notePageOpen))}
              onSaved={(note) => handleNoteChange(notePageOpen, note, null)}
              onDeleted={(id) => handleNoteChange(notePageOpen, null, id)}
              onCancel={() => setNotePageOpen(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
