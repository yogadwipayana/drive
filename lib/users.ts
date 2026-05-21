import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getDb } from "./db";

export type User = {
  id: string;
  email: string;
  createdAt: number;
};

type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
};

export const BCRYPT_COST = 12;

function newUserId(): string {
  return randomBytes(12).toString("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8 && password.length <= 200;
}

export async function createUser(email: string, password: string): Promise<User> {
  const db = getDb();
  const id = newUserId();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const createdAt = Date.now();
  db.prepare(
    "INSERT INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)",
  ).run(id, email, passwordHash, createdAt);
  return { id, email, createdAt };
}

export function findUserByEmail(email: string): UserRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, passwordHash, createdAt FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;
  return row ?? null;
}

export function findUserById(id: string): User | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, createdAt FROM users WHERE id = ?")
    .get(id) as User | undefined;
  return row ?? null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Verify password and transparently rehash if the stored cost is below BCRYPT_COST. */
export async function verifyAndRehash(
  userId: string,
  password: string,
  hash: string,
): Promise<boolean> {
  const valid = await bcrypt.compare(password, hash);
  if (!valid) return false;
  const rounds = bcrypt.getRounds(hash);
  if (rounds < BCRYPT_COST) {
    const newHash = await bcrypt.hash(password, BCRYPT_COST);
    getDb()
      .prepare("UPDATE users SET passwordHash = ? WHERE id = ?")
      .run(newHash, userId);
  }
  return true;
}
