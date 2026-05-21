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
};

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
  };
}

export function createImage(meta: ImageMetadata): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO images (storedName, userId, originalName, mime, size, width, height, uploadedAt, albumId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  );
}

export function getImage(storedName: string): ImageMetadata | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT storedName, userId, originalName, mime, size, width, height, uploadedAt, albumId FROM images WHERE storedName = ?",
    )
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
        "SELECT storedName, userId, originalName, mime, size, width, height, uploadedAt, albumId FROM images WHERE userId = ? AND albumId IS NULL",
      )
      .all(userId) as ImageRow[];
  } else if (filter?.albumId) {
    rows = db
      .prepare(
        "SELECT storedName, userId, originalName, mime, size, width, height, uploadedAt, albumId FROM images WHERE userId = ? AND albumId = ?",
      )
      .all(userId, filter.albumId) as ImageRow[];
  } else {
    rows = db
      .prepare(
        "SELECT storedName, userId, originalName, mime, size, width, height, uploadedAt, albumId FROM images WHERE userId = ?",
      )
      .all(userId) as ImageRow[];
  }
  return rows.map(rowToMeta);
}

export function listImagesByAlbum(albumId: string): ImageMetadata[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT storedName, userId, originalName, mime, size, width, height, uploadedAt, albumId FROM images WHERE albumId = ? ORDER BY uploadedAt DESC",
    )
    .all(albumId) as ImageRow[];
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

export function deleteImage(storedName: string): void {
  const db = getDb();
  db.prepare("DELETE FROM images WHERE storedName = ?").run(storedName);
}
