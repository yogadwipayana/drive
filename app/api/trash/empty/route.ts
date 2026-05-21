import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";
import { deleteImage, listTrashedByUser } from "@/lib/metadata";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const uploadRoot = path.resolve(UPLOAD_DIR);
  const trash = listTrashedByUser(user.id);
  const deleted: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const image of trash) {
    const name = image.storedName;
    const resolved = path.resolve(path.join(UPLOAD_DIR, name));
    if (!resolved.startsWith(uploadRoot + path.sep)) {
      failed.push({ name, error: "Invalid path" });
      continue;
    }

    // Audit log before permanent delete
    console.warn(JSON.stringify({ event: "permanent_delete", userId: user.id, storedName: name, ts: new Date().toISOString() }));

    // DB delete first; then best-effort unlink (orphan file < orphan row)
    deleteImage(name);

    try {
      await unlink(resolved);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "ENOENT") {
        console.error(JSON.stringify({ event: "unlink_failed", userId: user.id, storedName: name, ts: new Date().toISOString() }));
        failed.push({ name, error: "Failed to delete file" });
        continue;
      }
    }
    try {
      await unlink(path.join(UPLOAD_DIR, ".thumbs", `${name}.webp`));
    } catch {
      // best-effort
    }
    deleted.push(name);
  }

  return NextResponse.json({ deleted, failed });
}
