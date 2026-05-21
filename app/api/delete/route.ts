import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, isSafeStoredName } from "@/lib/storage";
import { deleteImage, getImage } from "@/lib/metadata";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const name = req.nextUrl.searchParams.get("name") ?? "";

  if (!isSafeStoredName(name)) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const resolved = path.resolve(path.join(UPLOAD_DIR, name));
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const image = getImage(name);
  if (!image || image.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await unlink(resolved);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }

  try {
    await unlink(path.join(UPLOAD_DIR, ".thumbs", `${name}.webp`));
  } catch {
    // best-effort
  }
  deleteImage(name);

  return NextResponse.json({ ok: true });
}
