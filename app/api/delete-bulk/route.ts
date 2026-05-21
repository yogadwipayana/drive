import { NextRequest, NextResponse } from "next/server";
import { isSafeStoredName } from "@/lib/storage";
import { getImage, softDeleteImage } from "@/lib/metadata";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const names = (body as { names?: unknown })?.names;
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: "names is required" }, { status: 400 });
  }
  if (names.length > 500) {
    return NextResponse.json({ error: "Too many names (max 500)" }, { status: 400 });
  }
  for (const n of names) {
    if (typeof n !== "string" || !isSafeStoredName(n)) {
      return NextResponse.json({ error: "Invalid name in list" }, { status: 400 });
    }
  }

  const deleted: string[] = [];
  const missing: string[] = [];
  const at = Date.now();

  for (const name of names as string[]) {
    const image = getImage(name);
    if (!image || image.userId !== user.id) {
      console.warn(JSON.stringify({ event: "authz_denied", route: "delete-bulk", userId: user.id, storedName: name, ip: req.headers.get("x-forwarded-for") ?? "unknown", ts: new Date().toISOString() }));
      missing.push(name);
      continue;
    }
    softDeleteImage(name, at);
    deleted.push(name);
  }

  return NextResponse.json({ deleted, missing, failed: [] });
}
