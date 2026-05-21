import { NextRequest, NextResponse } from "next/server";
import {
  createAlbum,
  listAlbumsByUser,
  sanitizeAlbumName,
} from "@/lib/albums";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const items = listAlbumsByUser(user.id);
  return NextResponse.json({ items });
}

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
  const rawName = (body as { name?: unknown })?.name;
  if (typeof rawName !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const name = sanitizeAlbumName(rawName);
  if (!name) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  const album = createAlbum(user.id, name);
  return NextResponse.json({ album });
}
