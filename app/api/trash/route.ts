import { NextRequest, NextResponse } from "next/server";
import { listTrashedByUser } from "@/lib/metadata";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const list = listTrashedByUser(user.id).map((m) => ({
    name: m.storedName,
    url: `/i/${m.storedName}`,
    size: m.size,
    mtime: m.uploadedAt,
    deletedAt: m.deletedAt,
    thumbUrl: `/api/thumb/${m.storedName}`,
    width: m.width,
    height: m.height,
    originalName: m.originalName,
    albumId: m.albumId,
    isPublic: m.isPublic,
  }));

  return NextResponse.json({ items: list, total: list.length });
}
