import path from "node:path";
import { mkdir, readFile, writeFile, unlink, readdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { UPLOAD_DIR } from "./storage";

export const ALBUM_DIR = path.join(UPLOAD_DIR, ".albums");

export type Album = {
  id: string;
  name: string;
  createdAt: number;
};

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function newAlbumId(len = 10): string {
  const bytes = randomBytes(len);
  let result = "";
  for (let i = 0; i < len; i++) result += BASE62[bytes[i] % 62];
  return result;
}

export function isSafeAlbumId(id: string): boolean {
  return /^[A-Za-z0-9]{4,32}$/.test(id);
}

export async function ensureAlbumDir(): Promise<void> {
  await mkdir(ALBUM_DIR, { recursive: true });
}

function albumPath(id: string): string {
  return path.join(ALBUM_DIR, `${id}.json`);
}

export async function writeAlbum(album: Album): Promise<void> {
  await ensureAlbumDir();
  await writeFile(albumPath(album.id), JSON.stringify(album, null, 2), "utf8");
}

export async function readAlbum(id: string): Promise<Album | null> {
  if (!isSafeAlbumId(id)) return null;
  try {
    const raw = await readFile(albumPath(id), "utf8");
    return JSON.parse(raw) as Album;
  } catch {
    return null;
  }
}

export async function deleteAlbum(id: string): Promise<void> {
  if (!isSafeAlbumId(id)) return;
  try {
    await unlink(albumPath(id));
  } catch {
    // best-effort
  }
}

export async function listAlbums(): Promise<Album[]> {
  await ensureAlbumDir();
  let entries: string[];
  try {
    entries = await readdir(ALBUM_DIR);
  } catch {
    return [];
  }
  const items = await Promise.all(
    entries
      .filter((e) => e.endsWith(".json"))
      .map(async (entry) => {
        try {
          const raw = await readFile(path.join(ALBUM_DIR, entry), "utf8");
          return JSON.parse(raw) as Album;
        } catch {
          return null;
        }
      }),
  );
  return items.filter((a): a is Album => a !== null).sort((a, b) => b.createdAt - a.createdAt);
}

export function sanitizeAlbumName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 80);
}
