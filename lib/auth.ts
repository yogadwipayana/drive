import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "./db";
import { findUserById, type User } from "./users";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: string): { id: string; expiresAt: number } {
  const db = getDb();
  const token = newSessionToken();
  const hashedId = hashToken(token);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare(
    "INSERT INTO sessions (id, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)",
  ).run(hashedId, userId, now, expiresAt);
  purgeExpired();
  // Return the raw token as the cookie value; only the hash is stored in DB.
  return { id: token, expiresAt };
}

export function destroySession(sessionId: string): void {
  const db = getDb();
  // sessionId here is the raw cookie token; hash it to find the DB row.
  db.prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(sessionId));
}

function purgeExpiredSessions(): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expiresAt < ?").run(Date.now());
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const hashedToken = hashToken(token);
  const db = getDb();
  const row = db
    .prepare("SELECT userId, expiresAt FROM sessions WHERE id = ?")
    .get(hashedToken) as { userId: string; expiresAt: number } | undefined;
  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt < now) {
    destroySession(token);
    return null;
  }

  // Sliding expiry: if more than half the TTL has elapsed, extend the session.
  const halfTtl = SESSION_TTL_MS / 2;
  if (row.expiresAt - now < halfTtl) {
    const newExpiresAt = now + SESSION_TTL_MS;
    db.prepare("UPDATE sessions SET expiresAt = ? WHERE id = ?").run(newExpiresAt, hashedToken);
    // Re-set the cookie with the extended expiry (token itself is unchanged).
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires: new Date(newExpiresAt),
    });
  }

  return findUserById(row.userId);
}

export async function getCurrentSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Unauthorized", 401);
  return user;
}

export function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}

export function setSessionCookie(res: NextResponse, sessionId: string, expiresAt: number): void {
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
}

export function purgeExpired(): void {
  purgeExpiredSessions();
}
