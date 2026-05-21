import { NextRequest, NextResponse } from "next/server";
import { ensureUploadDir } from "@/lib/storage";
import { listImagesByUser } from "@/lib/metadata";
import { isSafeAlbumId, getAlbumById } from "@/lib/albums";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SortKey = "date" | "name" | "size";
type Order = "asc" | "desc";

const VALID_SORT: ReadonlySet<SortKey> = new Set<SortKey>(["date", "name", "size"]);
const VALID_ORDER: ReadonlySet<Order> = new Set<Order>(["asc", "desc"]);

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  await ensureUploadDir();

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const sortRaw = (sp.get("sort") ?? "date") as SortKey;
  const orderRaw = (sp.get("order") ?? "desc") as Order;
  const sort: SortKey = VALID_SORT.has(sortRaw) ? sortRaw : "date";
  const order: Order = VALID_ORDER.has(orderRaw) ? orderRaw : "desc";

  const pageRaw = parseInt(sp.get("page") ?? "1", 10);
  const pageSizeRaw = parseInt(sp.get("pageSize") ?? "60", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const pageSize = Math.min(Math.max(Number.isFinite(pageSizeRaw) ? pageSizeRaw : 60, 1), 200);

  const albumParam = sp.get("album");
  let filterOpts: { albumId?: string | "none" } | undefined;

  if (albumParam === "none") {
    filterOpts = { albumId: "none" };
  } else if (albumParam) {
    if (!isSafeAlbumId(albumParam)) {
      return NextResponse.json({ error: "Invalid album" }, { status: 400 });
    }
    const album = getAlbumById(albumParam);
    if (!album || album.userId !== user.id) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    filterOpts = { albumId: albumParam };
  }

  const metaList = listImagesByUser(user.id, filterOpts);

  let list = metaList.map((m) => ({
    name: m.storedName,
    url: `/i/${m.storedName}`,
    size: m.size,
    mtime: m.uploadedAt,
    thumbUrl: `/api/thumb/${m.storedName}`,
    width: m.width,
    height: m.height,
    originalName: m.originalName,
    albumId: m.albumId,
  }));

  if (q) {
    list = list.filter((it) => {
      const haystack = `${it.name} ${it.originalName ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  const dir = order === "asc" ? 1 : -1;
  list.sort((a, b) => {
    if (sort === "name") {
      const an = (a.originalName ?? a.name).toLowerCase();
      const bn = (b.originalName ?? b.name).toLowerCase();
      return an.localeCompare(bn) * dir;
    }
    if (sort === "size") return (a.size - b.size) * dir;
    return (a.mtime - b.mtime) * dir;
  });

  const total = list.length;
  const start = (page - 1) * pageSize;
  const paged = list.slice(start, start + pageSize);
  const hasMore = start + paged.length < total;

  return NextResponse.json({
    items: paged,
    total,
    page,
    pageSize,
    hasMore,
  });
}
