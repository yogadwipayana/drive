import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
  "image/x-icon": ".ico",
};

export const ALLOWED_MIME = new Set(Object.keys(EXT_BY_MIME));

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

export function contentTypeForExt(ext: string): string {
  return CONTENT_TYPE_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

export function extForMime(mime: string, fallbackName: string): string {
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  const ext = path.extname(fallbackName).toLowerCase();
  return ext || ".bin";
}

export async function ensureUploadDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export function safeBaseName(original: string): string {
  const base = path.basename(original, path.extname(original));
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return cleaned || "image";
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function shortId(len = 8): string {
  const bytes = randomBytes(len);
  let result = "";
  for (let i = 0; i < len; i++) {
    result += BASE62[bytes[i] % 62];
  }
  return result;
}

export function isSafeStoredName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..");
}
