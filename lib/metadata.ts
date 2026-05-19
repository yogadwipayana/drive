import path from "node:path";
import { mkdir, readFile, writeFile, unlink, readdir } from "node:fs/promises";
import { UPLOAD_DIR, isSafeStoredName } from "./storage";

export const META_DIR = path.join(UPLOAD_DIR, ".meta");

export type ImageMetadata = {
  storedName: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  uploadedAt: number;
  albumId?: string;
};

export async function ensureMetaDir(): Promise<void> {
  await mkdir(META_DIR, { recursive: true });
}

function metaPathFor(storedName: string): string {
  return path.join(META_DIR, `${storedName}.json`);
}

export async function writeMetadata(meta: ImageMetadata): Promise<void> {
  await ensureMetaDir();
  await writeFile(metaPathFor(meta.storedName), JSON.stringify(meta, null, 2), "utf8");
}

export async function readMetadata(storedName: string): Promise<ImageMetadata | null> {
  if (!isSafeStoredName(storedName)) return null;
  try {
    const raw = await readFile(metaPathFor(storedName), "utf8");
    return JSON.parse(raw) as ImageMetadata;
  } catch {
    return null;
  }
}

export async function deleteMetadata(storedName: string): Promise<void> {
  try {
    await unlink(metaPathFor(storedName));
  } catch {
    // best-effort
  }
}

export async function updateMetadata(
  storedName: string,
  patch: Partial<ImageMetadata>,
): Promise<ImageMetadata | null> {
  const existing = await readMetadata(storedName);
  if (!existing) return null;
  const merged: ImageMetadata = { ...existing, ...patch, storedName: existing.storedName };
  await writeMetadata(merged);
  return merged;
}

export async function listMetadata(): Promise<Map<string, ImageMetadata>> {
  await ensureMetaDir();
  const out = new Map<string, ImageMetadata>();
  let entries: string[];
  try {
    entries = await readdir(META_DIR);
  } catch {
    return out;
  }
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.endsWith(".json")) return;
      try {
        const raw = await readFile(path.join(META_DIR, entry), "utf8");
        const parsed = JSON.parse(raw) as ImageMetadata;
        if (parsed.storedName) out.set(parsed.storedName, parsed);
      } catch {
        // skip bad files
      }
    }),
  );
  return out;
}
