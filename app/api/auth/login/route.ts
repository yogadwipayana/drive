export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { normalizeEmail, findUserByEmail, verifyAndRehash, BCRYPT_COST } from "@/lib/users";
import { createSession, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-do-not-use", BCRYPT_COST);

export async function POST(req: NextRequest) {
  // IP rate limit before reading body
  const ip = clientIp(req);
  const ipLimit = checkRateLimit(`login:${ip}`, { max: 10, windowMs: 60_000 });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } },
    );
  }

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

  // Per-email rate limit after parsing body
  const emailLimit = checkRateLimit(`login-email:${email}`, { max: 5, windowMs: 60_000 });
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSec) } },
    );
  }

  const userRow = findUserByEmail(email);

  // Always run a bcrypt compare to prevent timing attacks on user enumeration.
  const valid = userRow
    ? await verifyAndRehash(userRow.id, password, userRow.passwordHash)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!userRow || !valid) {
    console.warn(
      JSON.stringify({
        event: "auth_login_failure",
        email,
        ip: clientIp(req),
        ts: new Date().toISOString(),
      }),
    );
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const session = createSession(userRow.id);
  const res = NextResponse.json({ user: { id: userRow.id, email: userRow.email } });
  setSessionCookie(res, session.id, session.expiresAt);
  return res;
}
