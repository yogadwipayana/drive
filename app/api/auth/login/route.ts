export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { normalizeEmail, findUserByEmail, verifyPassword } from "@/lib/users";
import { createSession, setSessionCookie } from "@/lib/auth";

const DUMMY_HASH = "$2a$10$0000000000000000000000000000000000000000000000000000";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).email !== "string" ||
    typeof (body as Record<string, unknown>).password !== "string"
  ) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const { email: rawEmail, password } = body as { email: string; password: string };
  const email = normalizeEmail(rawEmail);
  const userRow = findUserByEmail(email);

  const hashToCompare = userRow ? userRow.passwordHash : DUMMY_HASH;
  const valid = await (userRow
    ? verifyPassword(password, hashToCompare)
    : bcrypt.compare(password, hashToCompare));

  if (!userRow || !valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const session = createSession(userRow.id);
  const res = NextResponse.json({ user: { id: userRow.id, email: userRow.email } });
  setSessionCookie(res, session.id, session.expiresAt);
  return res;
}
