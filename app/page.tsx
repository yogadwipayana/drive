"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Item = { name: string; url: string; size: number; mtime?: number; thumbUrl?: string };

type FileProgress = {
  name: string;
  total: number;
  sent: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadOne(file: File, onProgress: (sent: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.errors?.length) reject(new Error(data.errors[0].error));
          else resolve();
        } catch {
          resolve();
        }
      } else {
        reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [origin, setOrigin] = useState("");
  const [progList, setProgList] = useState<FileProgress[]>([]);
  const [lightbox, setLightbox] = useState<Item | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = progList.some((p) => p.status === "pending" || p.status === "uploading");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/list", { cache: "no-store" });
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    void refresh();
  }, [refresh]);

  // Lightbox keyboard + scroll lock
  useEffect(() => {
    if (!lightbox) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setError(null);

      const initial: FileProgress[] = list.map((f) => ({
        name: f.name,
        total: f.size,
        sent: 0,
        status: "pending",
      }));
      setProgList(initial);

      const errors: string[] = [];

      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setProgList((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "uploading" } : p)),
        );
        try {
          await uploadOne(file, (sent, total) => {
            setProgList((prev) =>
              prev.map((p, idx) => (idx === i ? { ...p, sent, total } : p)),
            );
          });
          setProgList((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, sent: p.total, status: "done" } : p)),
          );
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Upload failed";
          errors.push(`${file.name}: ${msg}`);
          setProgList((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, status: "error", error: msg } : p)),
          );
        }
      }

      await refresh();
      if (errors.length) setError(errors.join("\n"));
      setTimeout(() => setProgList([]), 2000);
    },
    [refresh],
  );

  // Paste-to-upload
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const imageFiles = Array.from(e.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (imageFiles.length) void upload(imageFiles);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [upload]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) void upload(e.dataTransfer.files);
    },
    [upload],
  );

  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
  }, []);

  const deleteItem = useCallback(
    async (name: string) => {
      if (!confirm(`Delete ${name}?`)) return;
      try {
        const res = await fetch(`/api/delete?name=${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Delete failed (${res.status})`);
        }
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    },
    [refresh],
  );

  const doneCount = progList.filter((p) => p.status === "done" || p.status === "error").length;
  const dropzoneLabel = busy
    ? `Uploading ${doneCount + 1} of ${progList.length}…`
    : "Tap or drop images here";

  return (
    <main className="page">
      <header className="header">
        <h1 className="title">Image Host</h1>
        <p className="subtitle">Drop images below. Each upload gets a shareable URL.</p>
      </header>

      <div
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p className="dropzone-primary">{dropzoneLabel}</p>
        <p className="dropzone-hint">
          jpg, png, webp, avif, svg · validated, sanitized, metadata stripped
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {progList.length > 0 && (
        <div className="progress">
          {progList.map((p) => {
            const pct = p.total > 0 ? Math.round((p.sent / p.total) * 100) : 0;
            return (
              <div key={p.name} className="progress-row">
                <span className="progress-name" title={p.name}>{p.name}</span>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${p.status === "done" ? 100 : pct}%`,
                      background: p.status === "error" ? "#ff6b6b" : undefined,
                    }}
                  />
                </div>
                <span className="progress-pct">
                  {p.status === "error" ? "✗" : p.status === "done" ? "✓" : `${pct}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error && <pre className="error">{error}</pre>}

      <section className="gallery">
        <div className="gallery-head">
          <h2 className="gallery-title">
            Gallery{" "}
            {items.length > 0 && <span className="gallery-count">({items.length})</span>}
          </h2>
          <button onClick={refresh} className="btn">Refresh</button>
        </div>

        {items.length === 0 ? (
          <p className="empty">No images yet.</p>
        ) : (
          <ul className="grid">
            {items.map((it) => {
              const full = origin ? `${origin}${it.url}` : it.url;
              return (
                <li key={it.name} className="card">
                  <div className="card-thumb-wrap" onClick={() => setLightbox(it)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.thumbUrl ?? it.url}
                      alt={it.name}
                      className="card-thumb"
                    />
                    <button
                      className="card-delete"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); void deleteItem(it.name); }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="card-name" title={it.name}>{it.name}</div>
                    <div className="card-meta">
                      <span>{formatSize(it.size)}</span>
                      <button onClick={() => copy(full)} className="btn btn-sm">
                        Copy URL
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={`/i/${lightbox.name}`}
            target="_blank"
            rel="noreferrer"
            className="lightbox-link"
            onClick={(e) => e.stopPropagation()}
          >
            View original
          </a>
        </div>
      )}
    </main>
  );
}
