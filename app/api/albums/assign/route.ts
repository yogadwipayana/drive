import { NextRequest, NextResponse } from "next/server";
import { isSafeAlbumId, readAlbum } from "@/lib/albums";
import { readMetadata, updateMetadata } from "@/lib/metadata";
import { isSafeStoredName } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  let resolvedAlbumId: string | undefined;
  if (albumId === null || albumId === "" || typeof albumId === "undefined") {
    resolvedAlbumId = undefined;
  } else if (typeof albumId === "string") {
    if (!isSafeAlbumId(albumId)) {
      return NextResponse.json({ error: "Invalid albumId" }, { status: 400 });
    }
    const album = await readAlbum(albumId);
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    resolvedAlbumId = album.id;
  } else {
    return NextResponse.json({ error: "Invalid albumId" }, { status: 400 });
  }

  const updated: string[] = [];
  const missing: string[] = [];
  for (const name of names as string[]) {
    const existing = await readMetadata(name);
    if (!existing) {
      missing.push(name);
      continue;
    }
    await updateMetadata(name, { albumId: resolvedAlbumId });
    updated.push(name);
  }

  return NextResponse.json({ updated, missing });
}
