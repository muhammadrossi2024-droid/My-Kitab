import { PDFParse } from "pdf-parse";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const path =
  "C:\\Users\\User\\AppData\\Local\\Packages\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\\LocalState\\sessions\\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\\transfers\\2026-31\\An-Explanation-of-the-Four-Fundamental-Principles-Sh-Salih-al-Fawzan.pdf";

const outDir = "C:\\Users\\User\\AppData\\Local\\Temp\\claude\\C--Users-User\\5e17f108-5b01-45a4-809c-9a0e0177bc31\\scratchpad\\fawzan-pages";
await mkdir(outDir, { recursive: true });

const buffer = await readFile(path);
const parser = new PDFParse({ data: buffer });

const pagesToRender = process.argv.slice(2).map(Number);
const result = await parser.getScreenshot({ partial: pagesToRender, scale: 2 });
await parser.destroy();

for (const page of result.pages) {
  const outPath = `${outDir}\\page-${page.pageNumber}.png`;
  await writeFile(outPath, page.data);
  console.log("wrote", outPath);
}
