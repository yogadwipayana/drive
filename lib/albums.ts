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
