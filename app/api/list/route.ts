import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, ensureUploadDir } from "@/lib/storage";
import { listMetadata } from "@/lib/metadata";
import { isSafeAlbumId } from "@/lib/albums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SortKey = "date" | "name" | "size";
type Order = "asc" | "desc";

const VALID_SORT: ReadonlySet<SortKey> = new Set<SortKey>(["date", "name", "size"]);
const VALID_ORDER: ReadonlySet<Order> = new Set<Order>(["asc", "desc"]);

export async function GET(req: NextRequest) {
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
  let albumFilter: string | "none" | undefined;
  if (albumParam === "none") {
    albumFilter = "none";
  } else if (albumParam) {
    if (!isSafeAlbumId(albumParam)) {
      return NextResponse.json({ error: "Invalid album" }, { status: 400 });
    }
    albumFilter = albumParam;
  }

  const [names, meta] = await Promise.all([readdir(UPLOAD_DIR), listMetadata()]);

  const items = await Promise.all(
    names.map(async (name) => {
      if (name.startsWith(".")) return null;
      try {
        const info = await stat(path.join(UPLOAD_DIR, name));
        if (!info.isFile()) return null;
        const m = meta.get(name);
        return {
          name,
          url: `/i/${name}`,
          size: info.size,
          mtime: m?.uploadedAt ?? info.mtimeMs,
          thumbUrl: `/api/thumb/${name}`,
          width: m?.width,
          height: m?.height,
          originalName: m?.originalName,
          albumId: m?.albumId,
        };
      } catch {
        return null;
      }
    }),
  );

  let list = items.filter((v): v is NonNullable<typeof v> => v !== null);

  if (albumFilter === "none") {
    list = list.filter((it) => !it.albumId);
  } else if (albumFilter) {
    list = list.filter((it) => it.albumId === albumFilter);
  }

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
