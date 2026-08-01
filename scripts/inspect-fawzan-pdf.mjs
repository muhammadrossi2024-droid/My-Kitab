import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "node:fs";

const path =
  "C:\\Users\\User\\AppData\\Local\\Packages\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\\LocalState\\sessions\\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\\transfers\\2026-31\\An-Explanation-of-the-Four-Fundamental-Principles-Sh-Salih-al-Fawzan.pdf";

const data = new Uint8Array(fs.readFileSync(path));
const doc = await getDocument({ data }).promise;
console.log("Number of pages:", doc.numPages);

for (const pageNum of [1, 2, 3, 5, 10, 20]) {
  if (pageNum > doc.numPages) continue;
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  const text = content.items.map((it) => it.str).join(" ");
  console.log(`\n--- Page ${pageNum} (${text.length} chars) ---`);
  console.log(text.slice(0, 600));
}
