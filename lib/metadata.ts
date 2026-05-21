import { getDb } from "./db";

export type ImageMetadata = {
  storedName: string;
  userId: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  uploadedAt: number;
  albumId?: string;
  isPublic?: boolean;
  deletedAt?: number;
};

type ImageRow = {
  storedName: string;
  userId: string;
  originalName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  uploadedAt: number;
  albumId: string | null;
  isPublic: number;
  deletedAt: number | null;
};

const SELECT_COLS =
  "storedName, userId, originalName, mime, size, width, height, uploadedAt, albumId, isPublic, deletedAt";

function rowToMeta(row: ImageRow): ImageMetadata {
  return {
    storedName: row.storedName,
    userId: row.userId,
    originalName: row.originalName,
    mime: row.mime,
    size: row.size,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    uploadedAt: row.uploadedAt,
    albumId: row.albumId ?? undefined,
    isPublic: row.isPublic === 1,
    deletedAt: row.deletedAt ?? undefined,
  };
}

export function createImage(meta: ImageMetadata): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO images (storedName, userId, originalName, mime, size, width, height, uploadedAt, albumId, isPublic)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    meta.storedName,
    meta.userId,
    meta.originalName,
    meta.mime,
    meta.size,
    meta.width ?? null,
    meta.height ?? null,
    meta.uploadedAt,
    meta.albumId ?? null,
    meta.isPublic ? 1 : 0,
  );
}

export function getImage(
  storedName: string,
  opts?: { includeDeleted?: boolean },
): ImageMetadata | null {
  const db = getDb();
  const where = opts?.includeDeleted
    ? "storedName = ?"
    : "storedName = ? AND deletedAt IS NULL";
  const row = db
    .prepare(`SELECT ${SELECT_COLS} FROM images WHERE ${where}`)
    .get(storedName) as ImageRow | undefined;
  return row ? rowToMeta(row) : null;
}

export function listImagesByUser(
  userId: string,
  filter?: { albumId?: string | "none" },
): ImageMetadata[] {
  const db = getDb();
  let rows: ImageRow[];
  if (filter?.albumId === "none") {
    rows = db
      .prepare(
        `SELECT ${SELECT_COLS} FROM images WHERE userId = ? AND albumId IS NULL AND deletedAt IS NULL`,
      )
      .all(userId) as ImageRow[];
  } else if (filter?.albumId) {
    rows = db
      .prepare(
        `SELECT ${SELECT_COLS} FROM images WHERE userId = ? AND albumId = ? AND deletedAt IS NULL`,
      )
      .all(userId, filter.albumId) as ImageRow[];
  } else {
    rows = db
      .prepare(
        `SELECT ${SELECT_COLS} FROM images WHERE userId = ? AND deletedAt IS NULL`,
      )
      .all(userId) as ImageRow[];
  }
  return rows.map(rowToMeta);
}

export function listImagesByAlbum(albumId: string): ImageMetadata[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM images WHERE albumId = ? AND deletedAt IS NULL ORDER BY uploadedAt DESC`,
    )
    .all(albumId) as ImageRow[];
  return rows.map(rowToMeta);
}

export function listTrashedByUser(userId: string): ImageMetadata[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM images WHERE userId = ? AND deletedAt IS NOT NULL ORDER BY deletedAt DESC`,
    )
    .all(userId) as ImageRow[];
  return rows.map(rowToMeta);
}

export function updateImageAlbum(
  storedName: string,
  albumId: string | null,
): void {
  const db = getDb();
  db.prepare("UPDATE images SET albumId = ? WHERE storedName = ?").run(
    albumId,
    storedName,
  );
}

export function setImagePublic(storedName: string, isPublic: boolean): void {
  const db = getDb();
  db.prepare("UPDATE images SET isPublic = ? WHERE storedName = ?").run(
    isPublic ? 1 : 0,
    storedName,
  );
}

export function softDeleteImage(storedName: string, at: number = Date.now()): void {
  const db = getDb();
  db.prepare("UPDATE images SET deletedAt = ? WHERE storedName = ?").run(
    at,
    storedName,
  );
}

export function restoreImage(storedName: string): void {
  const db = getDb();
  db.prepare("UPDATE images SET deletedAt = NULL WHERE storedName = ?").run(
    storedName,
  );
}

export function deleteImage(storedName: string): void {
  const db = getDb();
  db.prepare("DELETE FROM images WHERE storedName = ?").run(storedName);
}

export function getUserStorageBytes(userId: string): number {
  const row = getDb()
    .prepare(
      "SELECT COALESCE(SUM(size), 0) AS total FROM images WHERE userId = ? AND deletedAt IS NULL",
    )
    .get(userId) as { total: number };
  return row.total;
}
