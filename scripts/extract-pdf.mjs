import fs from "node:fs";
import { PDFParse } from "pdf-parse";

const path =
  "C:\\Users\\User\\AppData\\Local\\Packages\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\\LocalState\\sessions\\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\\transfers\\2026-31\\01Mutoon.pdf";

const [, , startArg, endArg, outDir] = process.argv;
const start = parseInt(startArg, 10);
const end = parseInt(endArg, 10);
const dir = outDir || "scratch_pdf_pages";
fs.mkdirSync(dir, { recursive: true });

const buf = fs.readFileSync(path);
const parser = new PDFParse({ data: buf });
const pages = [];
for (let p = start; p <= end; p++) pages.push(p);
const result = await parser.getScreenshot({ scale: 2.5, partial: pages });
await parser.destroy();

result.pages.forEach((page, i) => {
  const pageNum = pages[i];
  fs.writeFileSync(`${dir}/page-${String(pageNum).padStart(3, "0")}.png`, page.data);
});
console.log(`Rendered ${result.pages.length} pages to ${dir}/`);
