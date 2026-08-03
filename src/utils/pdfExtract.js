// Client-side PDF text extraction for My Kitab uploads, using pdfjs-dist
// (the standard library for parsing PDFs in the browser) instead of writing
// a parser from scratch. Also used by the in-app viewer (openPdfDocument) so
// both paths share one worker setup.
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

function friendlyPdfError(err) {
  const name = err?.name || "";
  if (name === "PasswordException") return "this PDF is password-protected";
  if (name === "InvalidPDFException") return "this isn't a valid PDF file";
  if (err?.message) return err.message;
  return "the file couldn't be read";
}

// Glyph data for the 14 standard PDF fonts (Helvetica, Times, etc.) — a
// one-time copy of node_modules/pdfjs-dist/standard_fonts into public/
// (committed as static assets, same as the app's other public/ files).
// Without this, rendering (page.render, used by both the cover-thumbnail
// generator and the in-app viewer) hangs indefinitely on any PDF that
// references a standard font without embedding its own font program,
// instead of either drawing or failing outright — text extraction is
// unaffected since that only needs character codes, never actual glyphs,
// which is why this bug was invisible there.
const STANDARD_FONT_DATA_URL = `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`;

// Opens a PDF from an ArrayBuffer/Uint8Array, throwing a friendly Error on
// failure instead of pdfjs's raw exception — used for both extraction and
// the in-app viewer.
export async function openPdfDocument(data) {
  try {
    return await pdfjsLib.getDocument({ data, standardFontDataUrl: STANDARD_FONT_DATA_URL }).promise;
  } catch (err) {
    throw new Error(friendlyPdfError(err));
  }
}

const COVER_THUMB_WIDTH = 300; // CSS px — a list thumbnail, not the reading view

// Renders the PDF's first page to a small PNG Blob for the library list's
// cover thumbnail. Deliberately separate in scale/purpose from the reading
// view's RENDER_SCALE in MyKitabViewer.jsx — that one intentionally renders
// at full device resolution for actual reading; this is just a recognizable
// thumbnail, so a fixed small width keeps it cheap to generate and store
// without touching the full-quality original blob at all.
async function renderCoverThumbnail(pdf) {
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = COVER_THUMB_WIDTH / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// Returns { pages: [{ pageNumber, text }], metadataTitle, coverThumb } for
// the PDF: every page's extracted text, the document's embedded /Title if it
// has one (fallback when the uploaded file's own name isn't usable), and a
// cover thumbnail Blob (or null if it couldn't be rendered).
export async function extractPdfPages(arrayBuffer) {
  const pdf = await openPdfDocument(arrayBuffer);

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNumber: i, text });
  }

  let metadataTitle = null;
  try {
    const meta = await pdf.getMetadata();
    const rawTitle = meta?.info?.Title;
    if (rawTitle && rawTitle.trim()) metadataTitle = rawTitle.trim();
  } catch {
    // Metadata is a nice-to-have fallback title source, not required —
    // extraction above has already succeeded without it.
  }

  let coverThumb = null;
  try {
    coverThumb = await renderCoverThumbnail(pdf);
  } catch {
    // An unusual/corrupt first page shouldn't block the upload itself — the
    // library list just falls back to a generic document icon for this one.
  }

  return { pages, metadataTitle, coverThumb };
}
