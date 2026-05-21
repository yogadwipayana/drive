import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import {
  ImageSecurityError,
  auditImageSecurity,
  secureImageUpload,
} from "@/lib/image-security";
import { UPLOAD_DIR, ensureUploadDir, shortId, safeBaseName } from "@/lib/storage";
import { createImage, getUserStorageBytes } from "@/lib/metadata";
import { isSafeAlbumId, getAlbumById } from "@/lib/albums";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GiB
const MAX_FILES_PER_REQUEST = 20;

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  // Rate limit: 60 uploads per user per minute
  const rl = checkRateLimit("upload:" + user.id, { max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads, please slow down" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files = form.getAll("file").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: "Too many files in one request (max 20)" },
      { status: 400 },
    );
  }

  const albumIdRaw = form.get("albumId");
  let albumId: string | undefined;
  if (typeof albumIdRaw === "string" && albumIdRaw.length > 0) {
    if (!isSafeAlbumId(albumIdRaw)) {
      return NextResponse.json({ error: "Invalid albumId" }, { status: 400 });
    }
    const album = getAlbumById(albumIdRaw);
    if (!album || album.userId !== user.id) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    albumId = album.id;
  }

  // Per-user quota check: 10 GiB
  const usedBytes = getUserStorageBytes(user.id);
  const incomingBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (usedBytes + incomingBytes > QUOTA_BYTES) {
    return NextResponse.json({ error: "Storage quota exceeded" }, { status: 413 });
  }

  await ensureUploadDir();

  const ip = clientIp(req);
  const saved: { name: string; url: string; size: number; width?: number; height?: number; thumbUrl: string }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const file of files) {
    try {
      const secured = await secureImageUpload(file);
      const base = safeBaseName(file.name);
      const stored = `${base}-${shortId(8)}${secured.ext}`;
      const dest = path.join(UPLOAD_DIR, stored);

      // Atomicity: write file first, then DB insert; unlink on DB failure
      await writeFile(dest, secured.buffer, { flag: "wx" });
      try {
        createImage({
          storedName: stored,
          userId: user.id,
          originalName: file.name,
          mime: secured.mime,
          size: secured.buffer.length,
          width: secured.width,
          height: secured.height,
          uploadedAt: Date.now(),
          albumId,
        });
      } catch (e) {
        await unlink(dest).catch(() => {});
        throw e;
      }

      saved.push({ name: stored, url: `/i/${stored}`, size: secured.buffer.length, width: secured.width, height: secured.height, thumbUrl: `/api/thumb/${stored}` });
      auditImageSecurity({
        action: "accepted",
        fileName: file.name,
        claimedType: file.type || "unknown",
        detectedType: secured.mime,
        size: file.size,
        width: secured.width,
        height: secured.height,
      });
      console.info(JSON.stringify({ event: "upload_accepted", userId: user.id, ip, fileName: file.name, storedName: stored, ts: new Date().toISOString() }));
    } catch (error) {
      const message = error instanceof ImageSecurityError ? error.message : "Image failed security processing";
      errors.push({ name: file.name, error: message });
      auditImageSecurity({
        action: "rejected",
        fileName: file.name,
        claimedType: file.type || "unknown",
        size: file.size,
        reason: message,
      });
      console.info(JSON.stringify({ event: "upload_rejected", userId: user.id, ip, fileName: file.name, reason: message, ts: new Date().toISOString() }));
    }
  }

  return NextResponse.json({ saved, errors });
}
