import { randomBytes } from "node:crypto";
import { getDb } from "./db";

export type Album = {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  createdAt: number;
};

type AlbumRow = {
  id: string;
  userId: string;
  name: string;
  isPublic: number;
  createdAt: number;
};

export function newAlbumId(_len?: number): string {
  return randomBytes(16).toString("base64url"); // ~22 chars, 128 bits, no modulo bias
}

export function isSafeAlbumId(id: string): boolean {
  // Accept alphanumeric plus base64url chars (-_); length 4–32
  return /^[A-Za-z0-9_-]{4,32}$/.test(id);
}

export function sanitizeAlbumName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 80);
}

function rowToAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    isPublic: row.isPublic === 1,
    createdAt: row.createdAt,
  };
}

export function createAlbum(userId: string, name: string): Album {
  const db = getDb();
  const id = newAlbumId();
  const createdAt = Date.now();
  db.prepare(
    "INSERT INTO albums (id, userId, name, isPublic, createdAt) VALUES (?, ?, ?, 0, ?)",
  ).run(id, userId, name, createdAt);
  return { id, userId, name, isPublic: false, createdAt };
}

export function getAlbumById(id: string): Album | null {
  if (!isSafeAlbumId(id)) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, userId, name, isPublic, createdAt FROM albums WHERE id = ?")
    .get(id) as AlbumRow | undefined;
  return row ? rowToAlbum(row) : null;
}

export function listAlbumsByUser(
  userId: string,
): Array<Album & { count: number }> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.id, a.userId, a.name, a.isPublic, a.createdAt,
              (SELECT COUNT(*) FROM images i WHERE i.albumId = a.id) AS count
       FROM albums a
       WHERE a.userId = ?
       ORDER BY a.createdAt DESC`,
    )
    .all(userId) as Array<AlbumRow & { count: number }>;
  return rows.map((r) => ({ ...rowToAlbum(r), count: r.count }));
}

export function updateAlbum(
  id: string,
  patch: { name?: string; isPublic?: boolean },
): Album | null {
  const db = getDb();
  const existing = getAlbumById(id);
  if (!existing) return null;
  const name = patch.name ?? existing.name;
  const isPublic =
    patch.isPublic === undefined ? existing.isPublic : patch.isPublic;
  db.prepare("UPDATE albums SET name = ?, isPublic = ? WHERE id = ?").run(
    name,
    isPublic ? 1 : 0,
    id,
  );
  return { ...existing, name, isPublic };
}

export function deleteAlbum(id: string): void {
  if (!isSafeAlbumId(id)) return;
  const db = getDb();
  db.prepare("DELETE FROM albums WHERE id = ?").run(id);
}
