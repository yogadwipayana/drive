import { notFound } from "next/navigation";
import { isSafeAlbumId, readAlbum } from "@/lib/albums";
import { listMetadata } from "@/lib/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShareItem = {
  name: string;
  url: string;
  thumbUrl: string;
  size: number;
  width?: number;
  height?: number;
  uploadedAt: number;
  originalName: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AlbumSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSafeAlbumId(id)) notFound();

  const album = await readAlbum(id);
  if (!album) notFound();

  const meta = await listMetadata();
  const items: ShareItem[] = Array.from(meta.values())
    .filter((m) => m.albumId === id)
    .sort((a, b) => b.uploadedAt - a.uploadedAt)
    .map((m) => ({
      name: m.storedName,
      url: `/i/${m.storedName}`,
      thumbUrl: `/api/thumb/${m.storedName}`,
      size: m.size,
      width: m.width,
      height: m.height,
      uploadedAt: m.uploadedAt,
      originalName: m.originalName,
    }));

  return (
    <main className="page">
      <header className="header">
        <h1 className="title">{album.name}</h1>
        <p className="subtitle">
          {items.length} {items.length === 1 ? "image" : "images"} · shared album
        </p>
      </header>

      <section className="gallery">
        {items.length === 0 ? (
          <p className="empty">This album is empty.</p>
        ) : (
          <ul className="grid">
            {items.map((it) => (
              <li key={it.name} className="card">
                <a href={it.url} target="_blank" rel="noreferrer" className="card-thumb-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.thumbUrl} alt={it.originalName} className="card-thumb" />
                </a>
                <div className="card-body">
                  <div className="card-name" title={it.originalName}>
                    {it.originalName}
                  </div>
                  <div className="card-meta">
                    <span>{formatSize(it.size)}</span>
                    {it.width && it.height && (
                      <span>
                        {it.width}×{it.height}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
