import { NextRequest, NextResponse } from "next/server";
import {
  deleteAlbum,
  isSafeAlbumId,
  readAlbum,
  sanitizeAlbumName,
  writeAlbum,
} from "@/lib/albums";
import { listMetadata, updateMetadata } from "@/lib/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSafeAlbumId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const album = await readAlbum(id);
  if (!album) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const meta = await listMetadata();
  const items = Array.from(meta.values())
    .filter((m) => m.albumId === id)
    .sort((a, b) => b.uploadedAt - a.uploadedAt)
    .map((m) => ({
      name: m.storedName,
      url: `/i/${m.storedName}`,
      thumbUrl: `/api/thumb/${m.storedName}`,
      size: m.size,
      mtime: m.uploadedAt,
      width: m.width,
      height: m.height,
      originalName: m.originalName,
    }));
  return NextResponse.json({ album, items });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSafeAlbumId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const album = await readAlbum(id);
  if (!album) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const updated = { ...album, name };
  await writeAlbum(updated);
  return NextResponse.json({ album: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSafeAlbumId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const album = await readAlbum(id);
  if (!album) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const meta = await listMetadata();
  await Promise.all(
    Array.from(meta.values())
      .filter((m) => m.albumId === id)
      .map((m) => updateMetadata(m.storedName, { albumId: undefined })),
  );
  await deleteAlbum(id);
  return NextResponse.json({ ok: true });
}
