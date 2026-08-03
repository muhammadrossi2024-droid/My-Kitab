import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TextLayer } from "pdfjs-dist";
import { getPdf } from "../utils/myKitabDb.js";
import { openPdfDocument } from "../utils/pdfExtract.js";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const RENDER_SCALE = 1.6; // baseline canvas resolution before pinch-zoom
const HIGHLIGHT_WINDOW = 8; // text-layer spans considered together as one highlight run

function significantWords(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length >= 3);
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
    if (!canvas) return;
    try {
      const page = await pdfDoc.getPage(pageNumber);
      // Full device pixel ratio, uncapped — a capped ratio was quietly
      // downsampling pages on high-DPI (3x) phone screens, the opposite of
      // "original quality" rendering.
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: RENDER_SCALE * dpr });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
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
  // (uncapped-dpr) canvases are large, so for a long PDF keeping every
  // visited page's canvas alive would keep growing memory use and slow down
  // scrolling. Reverting to the unrendered placeholder (same 360px min-height
  // box shown before a page's first render, see .mykitab-page in index.css)
  // re-renders cheaply if the user scrolls back.
  function unrenderPage(pageNumber) {
    const canvas = canvasRefs.current[pageNumber - 1];
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    renderedRef.current.delete(pageNumber);
    setRenderedSet(new Set(renderedRef.current));
  }

  // Virtualized rendering: only pages near the viewport ever hold a rendered
  // canvas. A generous rootMargin keeps a comfortable buffer of pages ready
  // just off-screen (so flicking through quickly doesn't show blank
  // placeholders), while pages that scroll out past that buffer get their
  // canvas freed again instead of accumulating forever.
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number(entry.target.dataset.page);
          if (entry.isIntersecting) ensurePageRendered(pageNumber);
          else unrenderPage(pageNumber);
        }
      },
      { rootMargin: "900px 0px" }
    );
    pageWrapRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, numPages]);

  function jumpToPage(pageNumber) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > numPages) return;
    const el = pageWrapRefs.current[pageNumber - 1];
    if (el) el.scrollIntoView({ block: "start" });
    ensurePageRendered(pageNumber);
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
    const displayViewport = page.getViewport({ scale: RENDER_SCALE });
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
