// Client-side PDF text extraction for My Kitab uploads, using pdfjs-dist
// (the standard library for parsing PDFs in the browser) instead of writing
// a parser from scratch.
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// Returns [{ pageNumber, text }] for every page in the PDF.
export async function extractPdfPages(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
  return pages;
}
