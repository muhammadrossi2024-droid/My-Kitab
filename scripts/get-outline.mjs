import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const path =
  "C:\\Users\\User\\AppData\\Local\\Packages\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\\LocalState\\sessions\\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\\transfers\\2026-31\\01Mutoon.pdf";

const data = new Uint8Array(fs.readFileSync(path));
const doc = await getDocument({ data }).promise;
const outline = await doc.getOutline();

async function printOutline(items, depth = 0) {
  if (!items) return;
  for (const item of items) {
    let pageIndex = "?";
    try {
      if (item.dest) {
        const dest = typeof item.dest === "string" ? await doc.getDestination(item.dest) : item.dest;
        if (dest) pageIndex = await doc.getPageIndex(dest[0]);
      }
    } catch {
      // ignore
    }
    console.log("  ".repeat(depth) + `${item.title} -> page ${typeof pageIndex === "number" ? pageIndex + 1 : "?"}`);
    if (item.items) await printOutline(item.items, depth + 1);
  }
}

await printOutline(outline);
console.log("total pages:", doc.numPages);
