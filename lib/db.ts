import path from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import Database from "better-sqlite3";
import { UPLOAD_DIR } from "./storage";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  isPublic INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_albums_userId ON albums(userId);

CREATE TABLE IF NOT EXISTS images (
  storedName TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  originalName TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  uploadedAt INTEGER NOT NULL,
  albumId TEXT REFERENCES albums(id) ON DELETE SET NULL,
  isPublic INTEGER NOT NULL DEFAULT 0,
  deletedAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_images_userId ON images(userId);
CREATE INDEX IF NOT EXISTS idx_images_albumId ON images(albumId);
CREATE INDEX IF NOT EXISTS idx_images_uploadedAt ON images(uploadedAt);
`;

let dbInstance: Database.Database | null = null;

function wipeUploadsDir(): void {
  if (existsSync(UPLOAD_DIR)) {
    rmSync(UPLOAD_DIR, { recursive: true, force: true });
  }
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

function init(): Database.Database {
  const isFirstRun = !existsSync(DB_PATH);

  mkdirSync(DATA_DIR, { recursive: true });

  if (isFirstRun) {
    wipeUploadsDir();
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(SCHEMA);

  const imageCols = db
    .prepare("PRAGMA table_info(images)")
    .all() as Array<{ name: string }>;
  if (!imageCols.some((c) => c.name === "isPublic")) {
    db.exec("ALTER TABLE images ADD COLUMN isPublic INTEGER NOT NULL DEFAULT 0");
  }
  if (!imageCols.some((c) => c.name === "deletedAt")) {
    db.exec("ALTER TABLE images ADD COLUMN deletedAt INTEGER");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_images_deletedAt ON images(deletedAt)");

  if (isFirstRun) {
    db.prepare(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
    ).run("schema_version", "1");
  }

  return db;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = init();
  }
  return dbInstance;
}
