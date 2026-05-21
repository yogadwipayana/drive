import { NextRequest, NextResponse } from "next/server";
import { isSafeAlbumId, getAlbumById } from "@/lib/albums";
import { getImage, updateImageAlbum } from "@/lib/metadata";
import { isSafeStoredName } from "@/lib/storage";
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
  const { names, albumId } = body as { names?: unknown; albumId?: unknown };
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: "names is required" }, { status: 400 });
  }
  for (const n of names) {
    if (typeof n !== "string" || !isSafeStoredName(n)) {
      return NextResponse.json({ error: "Invalid name in list" }, { status: 400 });
    }
  }

  let resolvedAlbumId: string | null = null;
  if (albumId === null || albumId === "" || typeof albumId === "undefined") {
    resolvedAlbumId = null;
  } else if (typeof albumId === "string") {
    if (!isSafeAlbumId(albumId)) {
      return NextResponse.json({ error: "Invalid albumId" }, { status: 400 });
    }
    const album = getAlbumById(albumId);
    if (!album || album.userId !== user.id) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    resolvedAlbumId = album.id;
  } else {
    return NextResponse.json({ error: "Invalid albumId" }, { status: 400 });
  }

  const updated: string[] = [];
  const missing: string[] = [];
  for (const name of names as string[]) {
    const image = getImage(name);
    if (!image || image.userId !== user.id) {
      missing.push(name);
      continue;
    }
    updateImageAlbum(name, resolvedAlbumId);
    updated.push(name);
  }

  return NextResponse.json({ updated, missing });
}
