import { randomBytes } from "node:crypto";
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

function newSessionId(): string {
  return randomBytes(32).toString("hex");
}

export function createSession(userId: string): { id: string; expiresAt: number } {
  const db = getDb();
  const id = newSessionId();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare(
    "INSERT INTO sessions (id, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)",
  ).run(id, userId, now, expiresAt);
  return { id, expiresAt };
}

export function destroySession(sessionId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

function purgeExpiredSessions(): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expiresAt < ?").run(Date.now());
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const db = getDb();
  const row = db
    .prepare("SELECT userId, expiresAt FROM sessions WHERE id = ?")
    .get(sid) as { userId: string; expiresAt: number } | undefined;
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    destroySession(sid);
    return null;
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
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function purgeExpired(): void {
  purgeExpiredSessions();
}
