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

// Opens a PDF from an ArrayBuffer/Uint8Array, throwing a friendly Error on
// failure instead of pdfjs's raw exception — used for both extraction and
// the in-app viewer.
export async function openPdfDocument(data) {
  try {
    return await pdfjsLib.getDocument({ data }).promise;
  } catch (err) {
    throw new Error(friendlyPdfError(err));
  }
}

// Returns { pages: [{ pageNumber, text }], metadataTitle } for every page in
// the PDF, plus the document's embedded /Title if it has one (used as a
// fallback when the uploaded file's own name isn't usable).
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

  return { pages, metadataTitle };
}
