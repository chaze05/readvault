import fs from "node:fs";
import path from "node:path";

const source = path.join(
  process.cwd(),
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.worker.min.mjs"
);
const destination = path.join(process.cwd(), "public", "pdf.worker.min.mjs");

if (!fs.existsSync(source)) {
  console.warn("PDF.js worker not found; run npm install first.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
console.log("Copied PDF.js worker to public/pdf.worker.min.mjs");
