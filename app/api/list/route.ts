import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, ensureUploadDir } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureUploadDir();
  const names = await readdir(UPLOAD_DIR);

  const items = await Promise.all(
    names.map(async (name) => {
      if (name.startsWith(".")) return null;
      try {
        const info = await stat(path.join(UPLOAD_DIR, name));
        if (!info.isFile()) return null;
        return {
          name,
          url: `/i/${name}`,
          size: info.size,
          mtime: info.mtimeMs,
          thumbUrl: `/api/thumb/${name}`,
        };
      } catch {
        return null;
      }
    }),
  );

  const list = items
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => b.mtime - a.mtime);

  return NextResponse.json({ items: list });
}
