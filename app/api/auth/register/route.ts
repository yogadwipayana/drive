export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  createUser,
  findUserByEmail,
} from "@/lib/users";
import { createSession, setSessionCookie } from "@/lib/auth";

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

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: "Password must be between 8 and 200 characters" },
      { status: 400 },
    );
  }

  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const user = await createUser(email, password);
  const session = createSession(user.id);

  const res = NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  setSessionCookie(res, session.id, session.expiresAt);
  return res;
}
