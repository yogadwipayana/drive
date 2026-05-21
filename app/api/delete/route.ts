import { NextRequest, NextResponse } from "next/server";
import { isSafeStoredName } from "@/lib/storage";
import { getImage, softDeleteImage } from "@/lib/metadata";
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

  const image = getImage(name);
  if (!image || image.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  softDeleteImage(name);

  return NextResponse.json({ ok: true });
}
