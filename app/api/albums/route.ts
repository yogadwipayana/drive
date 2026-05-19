import { NextRequest, NextResponse } from "next/server";
import {
  Album,
  ensureAlbumDir,
  listAlbums,
  newAlbumId,
  sanitizeAlbumName,
  writeAlbum,
} from "@/lib/albums";
import { listMetadata } from "@/lib/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureAlbumDir();
  const [albums, meta] = await Promise.all([listAlbums(), listMetadata()]);

  const counts = new Map<string, number>();
  for (const m of meta.values()) {
    if (m.albumId) counts.set(m.albumId, (counts.get(m.albumId) ?? 0) + 1);
  }

  const items = albums.map((a) => ({ ...a, count: counts.get(a.id) ?? 0 }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
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

  const album: Album = {
    id: newAlbumId(),
    name,
    createdAt: Date.now(),
  };
  await writeAlbum(album);
  return NextResponse.json({ album });
}
