import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, isSafeStoredName } from "@/lib/storage";
import { deleteImage, getImage } from "@/lib/metadata";
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

  const names = (body as { names?: unknown })?.names;
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: "names is required" }, { status: 400 });
  }
  if (names.length > 500) {
    return NextResponse.json({ error: "Too many names (max 500)" }, { status: 400 });
  }
  for (const n of names) {
    if (typeof n !== "string" || !isSafeStoredName(n)) {
      return NextResponse.json({ error: "Invalid name in list" }, { status: 400 });
    }
  }

  const uploadRoot = path.resolve(UPLOAD_DIR);
  const deleted: string[] = [];
  const missing: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const name of names as string[]) {
    const image = getImage(name, { includeDeleted: true });
    if (!image || image.userId !== user.id || !image.deletedAt) {
      missing.push(name);
      continue;
    }

    const resolved = path.resolve(path.join(UPLOAD_DIR, name));
    if (!resolved.startsWith(uploadRoot + path.sep)) {
      failed.push({ name, error: "Invalid path" });
      continue;
    }

    try {
      await unlink(resolved);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "ENOENT") {
        failed.push({
          name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        continue;
      }
    }
    try {
      await unlink(path.join(UPLOAD_DIR, ".thumbs", `${name}.webp`));
    } catch {
      // best-effort
    }
    deleteImage(name);
    deleted.push(name);
  }

  return NextResponse.json({ deleted, missing, failed });
}
