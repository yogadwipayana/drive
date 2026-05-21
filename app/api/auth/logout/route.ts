export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentSessionId, destroySession, clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const sessionId = await getCurrentSessionId();
  if (sessionId) {
    destroySession(sessionId);
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
