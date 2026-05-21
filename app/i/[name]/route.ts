import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import {
  UPLOAD_DIR,
  contentTypeForExt,
  isSafeStoredName,
} from "@/lib/storage";
import { getImage } from "@/lib/metadata";
import { getAlbumById } from "@/lib/albums";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  if (!isSafeStoredName(name)) {
    return new Response("Bad request", { status: 400 });
  }

  const meta = getImage(name);
  if (!meta) return new Response("Not found", { status: 404 });
  const user = await getCurrentUser();
  const isOwner = user && meta.userId === user.id;
  let isPublic = false;
  if (!isOwner && meta.albumId) {
    const album = getAlbumById(meta.albumId);
    isPublic = !!album?.isPublic;
  }
  if (!isOwner && !isPublic) return new Response("Not found", { status: 404 });

  const filePath = path.join(UPLOAD_DIR, name);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return new Response("Bad request", { status: 400 });
  }

  let info;
  try {
    info = await stat(resolved);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!info.isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();

  // Legacy SVG files must never be served as image/svg+xml (stored XSS risk).
  // Serve as a forced download with a neutral content type instead.
  if (ext === ".svg") {
    const stream = Readable.toWeb(createReadStream(resolved)) as ReadableStream;
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${path.basename(resolved)}"`,
        "Content-Length": String(info.size),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": isPublic ? "public, max-age=3600" : "private, max-age=3600",
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(resolved)) as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": contentTypeForExt(ext),
      "Content-Length": String(info.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isPublic ? "public, max-age=3600" : "private, max-age=3600",
    },
  });
}
