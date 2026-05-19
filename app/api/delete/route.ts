import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, isSafeStoredName } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";

  if (!isSafeStoredName(name)) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const resolved = path.resolve(path.join(UPLOAD_DIR, name));
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
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

  return NextResponse.json({ ok: true });
}
