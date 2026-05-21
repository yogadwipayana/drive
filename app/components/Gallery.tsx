"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { Dropdown } from "./Dropdown";
import Sidebar from "./Sidebar";
import { Topbar } from "./Topbar";
import {
  PublicIcon,
  PrivateIcon,
  LinkIcon,
  InfoIcon,
  MoveIcon,
  TrashIcon,
  RestoreIcon,
} from "./icons";

type Item = {
  name: string;
  url: string;
  size: number;
  mtime?: number;
  thumbUrl?: string;
  width?: number;
  height?: number;
  originalName?: string;
  albumId?: string;
  isPublic?: boolean;
  deletedAt?: number;
};

type Album = {
  id: string;
  name: string;
  createdAt: number;
  count: number;
  isPublic?: boolean;
};

type FileProgress = {
  name: string;
  total: number;
  sent: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

type SortKey = "date" | "name" | "size";
type Order = "asc" | "desc";
type View = "home" | "trash" | "album" | "unfiled";

const PAGE_SIZE = 60;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms?: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString();
}

function uploadOne(
  file: File,
  albumId: string | undefined,
  onProgress: (sent: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    if (albumId) fd.append("albumId", albumId);
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

export default function HomePage({ userEmail }: { userEmail: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [view, setView] = useState<View>("home");
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [albumsExpanded, setAlbumsExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [order, setOrder] = useState<Order>("desc");

  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [origin, setOrigin] = useState("");
  const [progList, setProgList] = useState<FileProgress[]>([]);
  const [lightbox, setLightbox] = useState<Item | null>(null);
  const [infoFor, setInfoFor] = useState<Item | null>(null);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMoveValue, setBulkMoveValue] = useState("");

  const [newAlbumOpen, setNewAlbumOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumBusy, setNewAlbumBusy] = useState(false);
  const [newAlbumError, setNewAlbumError] = useState<string | null>(null);
  const newAlbumInputRef = useRef<HTMLInputElement>(null);

  const [deleteAlbumTarget, setDeleteAlbumTarget] = useState<Album | null>(null);
  const [deleteAlbumBusy, setDeleteAlbumBusy] = useState(false);
  const [deleteAlbumError, setDeleteAlbumError] = useState<string | null>(null);

  const [menu, setMenu] = useState<{ x: number; y: number; item: Item } | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const busy = progList.some((p) => p.status === "pending" || p.status === "uploading");
  const isTrash = view === "trash";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const buildListUrl = useCallback(
    (pageNum: number) => {
      const u = new URL("/api/list", window.location.origin);
      u.searchParams.set("page", String(pageNum));
      u.searchParams.set("pageSize", String(PAGE_SIZE));
      u.searchParams.set("sort", sort);
      u.searchParams.set("order", order);
      if (debouncedQuery) u.searchParams.set("q", debouncedQuery);
      if (view === "unfiled") u.searchParams.set("album", "none");
      else if (view === "album" && activeAlbumId) u.searchParams.set("album", activeAlbumId);
      return u.toString();
    },
    [activeAlbumId, debouncedQuery, order, sort, view],
  );

  const loadFirstPage = useCallback(async () => {
    if (isTrash) {
      try {
        const res = await fetch("/api/trash", { cache: "no-store" });
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setHasMore(false);
        setPage(1);
      } catch {
        // ignore
      }
      return;
    }
    try {
      const res = await fetch(buildListUrl(1), { cache: "no-store" });
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setHasMore(Boolean(data.hasMore));
      setPage(1);
    } catch {
      // ignore
    }
  }, [buildListUrl, isTrash]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isTrash) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetch(buildListUrl(next), { cache: "no-store" });
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setHasMore(Boolean(data.hasMore));
      setPage(next);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [buildListUrl, hasMore, isTrash, loadingMore, page]);

  const refreshAlbums = useCallback(async () => {
    try {
      const res = await fetch("/api/albums", { cache: "no-store" });
      const data = await res.json();
      setAlbums(data.items ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    void loadFirstPage();
    void refreshAlbums();
  }, [loadFirstPage, refreshAlbums]);

  useEffect(() => {
    void loadFirstPage();
  }, [debouncedQuery, sort, order, view, activeAlbumId, loadFirstPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "300px 0px" },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (!lightbox) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  useEffect(() => {
    if (!infoFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoFor]);

  useEffect(() => {
    if (!newAlbumOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNewAlbumOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => newAlbumInputRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [newAlbumOpen]);

  useEffect(() => {
    if (!deleteAlbumTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteAlbumBusy) setDeleteAlbumTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteAlbumBusy, deleteAlbumTarget]);

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

      const targetAlbum = view === "album" && activeAlbumId ? activeAlbumId : undefined;

      const errors: string[] = [];

      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setProgList((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "uploading" } : p)),
        );
        try {
          await uploadOne(file, targetAlbum, (sent, total) => {
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

      await Promise.all([loadFirstPage(), refreshAlbums()]);
      if (errors.length) setError(errors.join("\n"));
      setTimeout(() => setProgList([]), 2000);
    },
    [activeAlbumId, loadFirstPage, refreshAlbums, view],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const imageFiles = Array.from(e.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null)
        .map((f) => {
          if (f.name && f.name !== "image.png") return f;
          const ext = f.type.split("/")[1] || "png";
          const ts = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .replace("T", "_")
            .slice(0, 19);
          return new File([f], `pasted-${ts}.${ext}`, { type: f.type });
        });
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
      try {
        const res = await fetch(`/api/delete?name=${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Delete failed (${res.status})`);
        }
        await Promise.all([loadFirstPage(), refreshAlbums()]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    },
    [loadFirstPage, refreshAlbums],
  );

  const restoreItem = useCallback(
    async (name: string) => {
      try {
        const res = await fetch("/api/trash/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [name] }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Restore failed (${res.status})`);
        }
        await Promise.all([loadFirstPage(), refreshAlbums()]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Restore failed");
      }
    },
    [loadFirstPage, refreshAlbums],
  );

  const deleteForever = useCallback(
    async (name: string) => {
      if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
      try {
        const res = await fetch("/api/trash/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [name] }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Delete failed (${res.status})`);
        }
        await loadFirstPage();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    },
    [loadFirstPage],
  );

  const emptyTrash = useCallback(async () => {
    if (!confirm("Permanently delete all items in trash? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/trash/empty", { method: "POST" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Empty trash failed (${res.status})`);
      }
      await loadFirstPage();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Empty trash failed");
    }
  }, [loadFirstPage]);

  const toggleSelected = useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((it) => it.name));
    });
  }, [items]);

  const exitSelectMode = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  const bulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} image${selected.size === 1 ? "" : "s"}?`)) return;
    try {
      const res = await fetch("/api/delete-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: Array.from(selected) }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Bulk delete failed (${res.status})`);
      }
      exitSelectMode();
      await Promise.all([loadFirstPage(), refreshAlbums()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    }
  }, [exitSelectMode, loadFirstPage, refreshAlbums, selected]);

  const bulkAssign = useCallback(
    async (albumId: string | null) => {
      if (selected.size === 0) return;
      try {
        const res = await fetch("/api/albums/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            names: Array.from(selected),
            albumId: albumId ?? null,
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Assign failed (${res.status})`);
        }
        exitSelectMode();
        await Promise.all([loadFirstPage(), refreshAlbums()]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Assign failed");
      }
    },
    [exitSelectMode, loadFirstPage, refreshAlbums, selected],
  );

  const createAlbum = useCallback(() => {
    setNewAlbumName("");
    setNewAlbumError(null);
    setNewAlbumOpen(true);
  }, []);

  const submitNewAlbum = useCallback(async () => {
    const name = newAlbumName.trim();
    if (!name || newAlbumBusy) return;
    setNewAlbumBusy(true);
    setNewAlbumError(null);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Create failed (${res.status})`);
      }
      const data = await res.json();
      await refreshAlbums();
      if (data.album?.id) {
        setView("album");
        setActiveAlbumId(data.album.id);
      }
      setNewAlbumOpen(false);
      setNewAlbumName("");
    } catch (e: unknown) {
      setNewAlbumError(e instanceof Error ? e.message : "Create album failed");
    } finally {
      setNewAlbumBusy(false);
    }
  }, [newAlbumBusy, newAlbumName, refreshAlbums]);

  const renameAlbum = useCallback(
    async (id: string, current: string) => {
      const name = prompt("New name?", current);
      if (!name || name === current) return;
      try {
        const res = await fetch(`/api/albums/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Rename failed (${res.status})`);
        }
        await refreshAlbums();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Rename failed");
      }
    },
    [refreshAlbums],
  );

  const deleteAlbum = useCallback((id: string, name: string) => {
    setDeleteAlbumTarget({ id, name, createdAt: 0, count: 0 });
    setDeleteAlbumError(null);
  }, []);

  const confirmDeleteAlbum = useCallback(async () => {
    if (!deleteAlbumTarget || deleteAlbumBusy) return;
    setDeleteAlbumBusy(true);
    setDeleteAlbumError(null);
    try {
      const res = await fetch(
        `/api/albums/${encodeURIComponent(deleteAlbumTarget.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Delete failed (${res.status})`);
      }
      if (view === "album" && activeAlbumId === deleteAlbumTarget.id) {
        setView("home");
        setActiveAlbumId(null);
      }
      await Promise.all([refreshAlbums(), loadFirstPage()]);
      setDeleteAlbumTarget(null);
    } catch (e: unknown) {
      setDeleteAlbumError(e instanceof Error ? e.message : "Delete album failed");
    } finally {
      setDeleteAlbumBusy(false);
    }
  }, [activeAlbumId, deleteAlbumBusy, deleteAlbumTarget, loadFirstPage, refreshAlbums, view]);

  const togglePublic = useCallback(
    async (album: Album) => {
      try {
        const res = await fetch(`/api/albums/${encodeURIComponent(album.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: !album.isPublic }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Update failed (${res.status})`);
        }
        await refreshAlbums();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    },
    [refreshAlbums],
  );

  const setItemPublic = useCallback(
    async (name: string, isPublic: boolean) => {
      setItems((prev) =>
        prev.map((it) => (it.name === name ? { ...it, isPublic } : it)),
      );
      try {
        const res = await fetch(`/api/images/${encodeURIComponent(name)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Update failed (${res.status})`);
        }
      } catch (e: unknown) {
        setItems((prev) =>
          prev.map((it) =>
            it.name === name ? { ...it, isPublic: !isPublic } : it,
          ),
        );
        setError(e instanceof Error ? e.message : "Update failed");
      }
    },
    [],
  );

  const assignItemToAlbum = useCallback(
    async (name: string, albumId: string | null) => {
      try {
        const res = await fetch("/api/albums/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [name], albumId }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Assign failed (${res.status})`);
        }
        await Promise.all([loadFirstPage(), refreshAlbums()]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Assign failed");
      }
    },
    [loadFirstPage, refreshAlbums],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/login";
  }, []);

  const doneCount = progList.filter((p) => p.status === "done" || p.status === "error").length;
  const activeAlbumObj = useMemo(
    () => albums.find((a) => a.id === activeAlbumId) ?? null,
    [activeAlbumId, albums],
  );
  const dropzoneLabel = busy
    ? `Uploading ${doneCount + 1} of ${progList.length}…`
    : view === "album" && activeAlbumObj
      ? `Tap or drop images here · into "${activeAlbumObj.name}"`
      : "Tap or drop images here";

  const allSelected = items.length > 0 && selected.size === items.length;
  const shareUrl =
    activeAlbumObj && origin ? `${origin}/a/${activeAlbumObj.id}` : "";

  const sectionTitle =
    view === "trash"
      ? "Trash"
      : view === "unfiled"
        ? "Unfiled"
        : view === "album"
          ? activeAlbumObj?.name ?? "Album"
          : "Home";

  return (
    <>
    <div className="shell">
      <Sidebar
        view={view}
        activeAlbumId={activeAlbumId}
        albums={albums}
        albumsExpanded={albumsExpanded}
        mobileOpen={mobileOpen}
        onSelectHome={() => {
          setView("home");
          setActiveAlbumId(null);
        }}
        onSelectTrash={() => {
          setView("trash");
          setActiveAlbumId(null);
        }}
        onSelectUnfiled={() => {
          setView("unfiled");
          setActiveAlbumId(null);
        }}
        onSelectAlbum={(id) => {
          setView("album");
          setActiveAlbumId(id);
        }}
        onToggleAlbumsExpanded={() => setAlbumsExpanded((v) => !v)}
        onCreateAlbum={createAlbum}
        onRenameAlbum={renameAlbum}
        onDeleteAlbum={deleteAlbum}
        onRefresh={() => {
          void Promise.all([loadFirstPage(), refreshAlbums()]);
        }}
        onEmptyTrash={emptyTrash}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="main">
        <Topbar
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          order={order}
          onOrderChange={setOrder}
          selecting={selecting}
          onToggleSelecting={() => (selecting ? exitSelectMode() : setSelecting(true))}
          onOpenMobileMenu={() => setMobileOpen(true)}
          userEmail={userEmail}
        />

        <div className="account-strip">
          <span className="account-email" title={userEmail}>
            {userEmail}
          </span>
          <button className="btn btn-sm" onClick={logout}>
            Log out
          </button>
        </div>

        <div className="main-content">
          {view === "trash" ? (
            <main className="page">
              <div className="album-bar">
                <span className="album-bar-label">
                  Trash · <strong>{total}</strong> {total === 1 ? "item" : "items"}
                </span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => void emptyTrash()}
                  disabled={items.length === 0}
                >
                  Empty trash
                </button>
              </div>

              <section className="gallery">
                {items.length === 0 ? (
                  <div className="trash-empty">
                    <div className="trash-empty-title">Trash is empty</div>
                    <p>Deleted images will appear here.</p>
                  </div>
                ) : (
                  <ul className="grid">
                    {items.map((it) => (
                      <li key={it.name} className="card">
                        <div
                          className="card-thumb-wrap"
                          onClick={() => setLightbox(it)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={it.thumbUrl ?? it.url}
                            alt={it.originalName ?? it.name}
                            className="card-thumb"
                          />
                        </div>
                        <div className="card-body">
                          <div className="card-name" title={it.originalName ?? it.name}>
                            {it.originalName ?? it.name}
                          </div>
                          <div className="card-meta">
                            <button
                              onClick={() => void restoreItem(it.name)}
                              className="btn btn-sm"
                            >
                              <RestoreIcon size={16} />
                              Restore
                            </button>
                            <button
                              onClick={() => void deleteForever(it.name)}
                              className="btn btn-sm btn-danger"
                            >
                              <TrashIcon size={16} />
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </main>
          ) : (
            <main className="page">
              {view === "album" && activeAlbumObj && (
                <div className="album-bar">
                  <span className="album-bar-label">
                    Album: <strong>{activeAlbumObj.name}</strong>
                  </span>
                  <label className="album-public-toggle">
                    <input
                      type="checkbox"
                      checked={!!activeAlbumObj.isPublic}
                      onChange={() => togglePublic(activeAlbumObj)}
                    />
                    <span>Public</span>
                  </label>
                  <button
                    className="btn btn-sm"
                    onClick={() => copy(shareUrl)}
                    disabled={!activeAlbumObj.isPublic}
                    title={
                      activeAlbumObj.isPublic
                        ? "Copy public share link"
                        : "Make album public to share"
                    }
                  >
                    Copy share link
                  </button>
                  <a
                    className="btn btn-sm"
                    href={`/a/${activeAlbumObj.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open share page
                  </a>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteAlbum(activeAlbumObj.id, activeAlbumObj.name)}
                  >
                    Delete album
                  </button>
                </div>
              )}

              <div
                className={`dropzone${dragging ? " is-dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
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
                        <span className="progress-name" title={p.name}>
                          {p.name}
                        </span>
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
                {selecting && (
                  <div className="bulkbar">
                    <span>{selected.size} selected</span>
                    <button className="btn btn-sm" onClick={toggleSelectAll}>
                      {allSelected ? "Clear" : "Select all on screen"}
                    </button>
                    <Dropdown
                      value={bulkMoveValue}
                      onChange={(v) => {
                        if (!v) return;
                        const albumId = v === "__none__" ? null : v;
                        void bulkAssign(albumId);
                        setBulkMoveValue("");
                      }}
                      options={[
                        { value: "__none__", label: "Unfiled" },
                        ...albums.map((a) => ({ value: a.id, label: a.name })),
                      ]}
                      placeholder="Move to…"
                      size="sm"
                      disabled={selected.size === 0}
                      ariaLabel="Move selected to album"
                    />
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={bulkDelete}
                      disabled={selected.size === 0}
                    >
                      Delete
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={clearSelection}
                      disabled={selected.size === 0}
                    >
                      Clear
                    </button>
                  </div>
                )}

                {items.length === 0 ? (
                  <p className="empty">
                    {debouncedQuery ? "No images match." : "No images yet."}
                  </p>
                ) : (
                  <ul className="grid">
                    {items.map((it) => {
                      const full = origin ? `${origin}${it.url}` : it.url;
                      const isSelected = selected.has(it.name);
                      return (
                        <li
                          key={it.name}
                          className={`card${isSelected ? " is-selected" : ""}`}
                        >
                          <div
                            className="card-thumb-wrap"
                            onClick={() => {
                              if (selecting) toggleSelected(it.name);
                              else setLightbox(it);
                            }}
                            onContextMenu={(e) => {
                              if (selecting) return;
                              e.preventDefault();
                              setMenu({ x: e.clientX, y: e.clientY, item: it });
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={it.thumbUrl ?? it.url}
                              alt={it.originalName ?? it.name}
                              className="card-thumb"
                            />
                            {selecting && (
                              <span className={`card-check${isSelected ? " is-on" : ""}`}>
                                {isSelected ? "✓" : ""}
                              </span>
                            )}
                            {!selecting && (
                              <button
                                className="card-delete"
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void deleteItem(it.name);
                                }}
                              >
                                ×
                              </button>
                            )}
                            {!selecting && (
                              <button
                                className="card-info"
                                title="Info"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInfoFor(it);
                                }}
                              >
                                i
                              </button>
                            )}
                            {it.isPublic && (
                              <span className="card-public" title="Public link enabled">
                                Public
                              </span>
                            )}
                          </div>
                          <div className="card-body">
                            <div className="card-name" title={it.originalName ?? it.name}>
                              {it.originalName ?? it.name}
                            </div>
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

                <div ref={sentinelRef} className="sentinel">
                  {loadingMore && <span className="empty">Loading…</span>}
                  {!hasMore && items.length > 0 && <span className="empty">End of list</span>}
                </div>
              </section>
            </main>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.originalName ?? lightbox.name}
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

      {infoFor && (
        <div className="lightbox" onClick={() => setInfoFor(null)}>
          <div className="info-panel" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setInfoFor(null)}>
              ×
            </button>
            <h3 className="info-title">Image info</h3>
            <dl className="info-list">
              <dt>Original name</dt>
              <dd>{infoFor.originalName ?? "—"}</dd>
              <dt>Stored as</dt>
              <dd>{infoFor.name}</dd>
              <dt>Size</dt>
              <dd>{formatSize(infoFor.size)}</dd>
              <dt>Dimensions</dt>
              <dd>
                {infoFor.width && infoFor.height
                  ? `${infoFor.width} × ${infoFor.height}`
                  : "—"}
              </dd>
              <dt>Uploaded</dt>
              <dd>{formatDate(infoFor.mtime)}</dd>
              <dt>Album</dt>
              <dd>
                {infoFor.albumId
                  ? albums.find((a) => a.id === infoFor.albumId)?.name ?? infoFor.albumId
                  : "Unfiled"}
              </dd>
              <dt>URL</dt>
              <dd className="info-url">
                <code>{origin ? `${origin}${infoFor.url}` : infoFor.url}</code>
                <button
                  className="btn btn-sm"
                  onClick={() => copy(origin ? `${origin}${infoFor.url}` : infoFor.url)}
                >
                  Copy
                </button>
              </dd>
            </dl>
          </div>
        </div>
      )}

      {newAlbumOpen && (
        <div
          className="lightbox"
          onClick={() => !newAlbumBusy && setNewAlbumOpen(false)}
        >
          <div className="info-panel" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setNewAlbumOpen(false)}
              disabled={newAlbumBusy}
            >
              ×
            </button>
            <h3 className="info-title">New album</h3>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submitNewAlbum();
              }}
            >
              <label className="modal-label" htmlFor="new-album-name">
                Album name
              </label>
              <input
                id="new-album-name"
                ref={newAlbumInputRef}
                type="text"
                className="modal-input"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="e.g. Vacation 2026"
                disabled={newAlbumBusy}
                autoComplete="off"
              />
              {newAlbumError && <p className="modal-error">{newAlbumError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setNewAlbumOpen(false)}
                  disabled={newAlbumBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={newAlbumBusy || newAlbumName.trim().length === 0}
                >
                  {newAlbumBusy ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteAlbumTarget && (
        <div
          className="lightbox"
          onClick={() => !deleteAlbumBusy && setDeleteAlbumTarget(null)}
        >
          <div className="info-panel" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setDeleteAlbumTarget(null)}
              disabled={deleteAlbumBusy}
            >
              ×
            </button>
            <h3 className="info-title">Delete album</h3>
            <p className="modal-text">
              Delete album <strong>&ldquo;{deleteAlbumTarget.name}&rdquo;</strong>?
              Images stay; they just become unassigned.
            </p>
            {deleteAlbumError && (
              <p className="modal-error">{deleteAlbumError}</p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setDeleteAlbumTarget(null)}
                disabled={deleteAlbumBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void confirmDeleteAlbum()}
                disabled={deleteAlbumBusy}
              >
                {deleteAlbumBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      {menu && (() => {
        const it = menu.item;
        const publicUrl = origin ? `${origin}/i/${it.name}` : `/i/${it.name}`;
        const items: ContextMenuItem[] = [
          {
            kind: "item",
            label: it.isPublic ? "Make private" : "Make public",
            icon: it.isPublic ? <PrivateIcon size={16} /> : <PublicIcon size={16} />,
            onSelect: () => void setItemPublic(it.name, !it.isPublic),
          },
          {
            kind: "item",
            label: "Copy public link",
            icon: <LinkIcon size={16} />,
            disabled: !it.isPublic,
            onSelect: () => copy(publicUrl),
          },
          { kind: "separator" },
          {
            kind: "item",
            label: "Copy URL",
            icon: <LinkIcon size={16} />,
            onSelect: () => copy(publicUrl),
          },
          {
            kind: "item",
            label: "View info",
            icon: <InfoIcon size={16} />,
            onSelect: () => setInfoFor(it),
          },
          {
            kind: "submenu",
            label: "Move to album",
            icon: <MoveIcon size={16} />,
            options: [
              { value: "__none__", label: "Unfiled" },
              ...albums.map((a) => ({ value: a.id, label: a.name })),
            ],
            onSelect: (v) =>
              void assignItemToAlbum(it.name, v === "__none__" ? null : v),
          },
          { kind: "separator" },
          {
            kind: "item",
            label: "Delete",
            icon: <TrashIcon size={16} />,
            danger: true,
            onSelect: () => void deleteItem(it.name),
          },
        ];
        return (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            items={items}
            onClose={() => setMenu(null)}
          />
        );
      })()}
    </>
  );
}
