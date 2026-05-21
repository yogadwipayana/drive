import { NextRequest, NextResponse } from "next/server";
import { stat, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UPLOAD_DIR, isSafeStoredName } from "@/lib/storage";
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

  const resolved = path.resolve(path.join(UPLOAD_DIR, name));
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return new Response("Bad request", { status: 400 });
  }

  let srcStat;
  try {
    srcStat = await stat(resolved);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!srcStat.isFile()) {
    return new Response("Not found", { status: 404 });
  }

  // SVG: redirect instead of resizing
  if (name.toLowerCase().endsWith(".svg")) {
    return NextResponse.redirect(new URL(`/i/${name}`, _req.url), 308);
  }

  const thumbsDir = path.join(UPLOAD_DIR, ".thumbs");
  const thumbPath = path.join(thumbsDir, `${name}.webp`);

  const headers = {
    "Content-Type": "image/webp",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  try {
    const thumbStat = await stat(thumbPath);
    if (thumbStat.mtimeMs >= srcStat.mtimeMs) {
      const data = await readFile(thumbPath);
      return new Response(data, { status: 200, headers });
    }
  } catch {
    // cache miss — generate below
  }

  const src = await readFile(resolved);
  const thumb = await sharp(src)
    .rotate()
    .resize(480, 480, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  await mkdir(thumbsDir, { recursive: true });
  await writeFile(thumbPath, thumb);

  return new Response(thumb, { status: 200, headers });
}
