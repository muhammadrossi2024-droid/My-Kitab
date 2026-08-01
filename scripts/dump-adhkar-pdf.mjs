import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "node:fs";

const path =
  "C:\\Users\\User\\AppData\\Local\\Packages\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\\LocalState\\sessions\\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\\transfers\\2026-31\\Morning-and-evening-supplications-V9-Web.pdf";

const data = new Uint8Array(fs.readFileSync(path));
const doc = await getDocument({ data }).promise;
let out = "";
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const content = await page.getTextContent();
  const text = content.items.map((it) => it.str).join(" ");
  out += `\n\n===== PAGE ${n} =====\n${text}`;
}
fs.writeFileSync("scratch-adhkar-dump.txt", out, "utf-8");
console.log("wrote scratch-adhkar-dump.txt,", out.length, "chars total");
