import { NextRequest, NextResponse } from "next/server";
import {
  deleteAlbum,
  getAlbumById,
  isSafeAlbumId,
  sanitizeAlbumName,
  updateAlbum,
} from "@/lib/albums";
import { listImagesByAlbum } from "@/lib/metadata";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const { id } = await params;
  if (!isSafeAlbumId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const album = getAlbumById(id);
  if (!album || album.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const images = listImagesByAlbum(id);
  const items = images.map((m) => ({
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
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const { id } = await params;
  if (!isSafeAlbumId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const album = getAlbumById(id);
  if (!album || album.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name: rawName, isPublic: rawIsPublic } = body as { name?: unknown; isPublic?: unknown };

  if (rawName === undefined && rawIsPublic === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const patch: { name?: string; isPublic?: boolean } = {};

  if (rawName !== undefined) {
    if (typeof rawName !== "string") {
      return NextResponse.json({ error: "name must be a string" }, { status: 400 });
    }
    const name = sanitizeAlbumName(rawName);
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    patch.name = name;
  }

  if (rawIsPublic !== undefined) {
    if (typeof rawIsPublic !== "boolean") {
      return NextResponse.json({ error: "isPublic must be a boolean" }, { status: 400 });
    }
    patch.isPublic = rawIsPublic;
  }

  const updated = updateAlbum(id, patch);
  return NextResponse.json({ album: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const { id } = await params;
  if (!isSafeAlbumId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const album = getAlbumById(id);
  if (!album || album.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  deleteAlbum(id);
  return NextResponse.json({ ok: true });
}
