import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const uploadsDir = path.join(process.cwd(), "data", "uploads");

export function createStoredName(now = Date.now(), id = randomUUID()): string {
  return `${now}-${id}.pdf`;
}

export function ensureUploadsDir(): void {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function isInsideUploads(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const root = path.resolve(uploadsDir);
  return resolved.startsWith(`${root}${path.sep}`);
}

export function savePdf(buffer: Buffer): {
  fileName: string;
  filePath: string;
} {
  ensureUploadsDir();
  const fileName = createStoredName();
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return { fileName, filePath };
}

export function deletePdf(filePath: string): boolean {
  if (!isInsideUploads(filePath) || !fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}
