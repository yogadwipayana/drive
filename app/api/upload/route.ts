import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ImageSecurityError,
  auditImageSecurity,
  secureImageUpload,
} from "@/lib/image-security";
import { UPLOAD_DIR, ensureUploadDir, shortId, safeBaseName } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  await ensureUploadDir();

  const saved: { name: string; url: string; size: number; width?: number; height?: number; thumbUrl: string }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const file of files) {
    try {
      const secured = await secureImageUpload(file);
      const base = safeBaseName(file.name);
      const stored = `${base}-${shortId(8)}${secured.ext}`;
      const dest = path.join(UPLOAD_DIR, stored);

      await writeFile(dest, secured.buffer, { flag: "wx" });

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
    }
  }

  return NextResponse.json({ saved, errors });
}
