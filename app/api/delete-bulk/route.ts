import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, isSafeStoredName } from "@/lib/storage";
import { deleteMetadata } from "@/lib/metadata";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
    const resolved = path.resolve(path.join(UPLOAD_DIR, name));
    if (!resolved.startsWith(uploadRoot + path.sep)) {
      failed.push({ name, error: "Invalid path" });
      continue;
    }
    try {
      await unlink(resolved);
      deleted.push(name);
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        missing.push(name);
      } else {
        failed.push({ name, error: err?.message ?? "Unknown error" });
        continue;
      }
    }
    try {
      await unlink(path.join(UPLOAD_DIR, ".thumbs", `${name}.webp`));
    } catch {
      // best-effort
    }
    await deleteMetadata(name);
  }

  return NextResponse.json({ deleted, missing, failed });
}
