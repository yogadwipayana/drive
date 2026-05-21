"use client";

import { useCallback, useState } from "react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

type Album = { id: string; name: string; createdAt: number; count: number };
type View = "home" | "trash" | "album" | "unfiled";

type SidebarProps = {
  view: View;
  activeAlbumId: string | null;
  albums: Album[];
  albumsExpanded: boolean;
  mobileOpen: boolean;
  onSelectHome: () => void;
  onSelectTrash: () => void;
  onSelectUnfiled: () => void;
  onSelectAlbum: (id: string) => void;
  onToggleAlbumsExpanded: () => void;
  onCreateAlbum: () => void;
  onRenameAlbum: (id: string, currentName: string) => void;
  onDeleteAlbum: (id: string, name: string) => void;
  onCloseMobile: () => void;
};

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 1L1 7v8h5v-5h4v5h5V7L8 1z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M6 2h4l1 1H5L6 2zM2 4h12v1H2V4zm2 2h8l-1 8H5L4 6zm2 1v6h1V7H6zm3 0v6h1V7H9z" />
  </svg>
);

export default function Sidebar({
  view,
  activeAlbumId,
  albums,
  albumsExpanded,
  mobileOpen,
  onSelectHome,
  onSelectTrash,
  onSelectUnfiled,
  onSelectAlbum,
  onToggleAlbumsExpanded,
  onCreateAlbum,
  onRenameAlbum,
  onDeleteAlbum,
  onCloseMobile,
}: SidebarProps) {
  const handleHome = useCallback(() => {
    onSelectHome();
    if (mobileOpen) onCloseMobile();
  }, [onSelectHome, mobileOpen, onCloseMobile]);

  const handleTrash = useCallback(() => {
    onSelectTrash();
    if (mobileOpen) onCloseMobile();
  }, [onSelectTrash, mobileOpen, onCloseMobile]);

  const handleUnfiled = useCallback(() => {
    onSelectUnfiled();
    if (mobileOpen) onCloseMobile();
  }, [onSelectUnfiled, mobileOpen, onCloseMobile]);

  const handleAlbum = useCallback(
    (id: string) => {
      onSelectAlbum(id);
      if (mobileOpen) onCloseMobile();
    },
    [onSelectAlbum, mobileOpen, onCloseMobile]
  );

  const [albumMenu, setAlbumMenu] = useState<
    { x: number; y: number; album: Album } | null
  >(null);

  const closeAlbumMenu = useCallback(() => setAlbumMenu(null), []);

  return (
    <>
      <div className="sidebar-backdrop" onClick={onCloseMobile} />
      <aside className={`sidebar${mobileOpen ? " is-open" : ""}`}>
        <div className="sidebar-brand">Image Host</div>

        <nav aria-label="Main navigation">
          <ul className="sidebar-nav">
            <li>
              <button
                type="button"
                className={`sidebar-link${view === "home" ? " is-active" : ""}`}
                onClick={handleHome}
                aria-current={view === "home" ? "page" : undefined}
              >
                <HomeIcon />
                Home
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-link${view === "trash" ? " is-active" : ""}`}
                onClick={handleTrash}
                aria-current={view === "trash" ? "page" : undefined}
              >
                <TrashIcon />
                Trash
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-albums-section">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              className="sidebar-section-header"
              onClick={onToggleAlbumsExpanded}
              aria-expanded={albumsExpanded}
            >
              <span className={`sidebar-chevron${albumsExpanded ? " is-expanded" : ""}`}>
                {albumsExpanded ? "▾" : "▸"}
              </span>
              Albums
            </button>
            <button
              type="button"
              className="sidebar-add-btn"
              onClick={onCreateAlbum}
              aria-label="Create new album"
            >
              +
            </button>
          </div>

          {albumsExpanded && (
            <ul className="sidebar-album-list">
              <li>
                <button
                  type="button"
                  className={`sidebar-album${view === "unfiled" ? " is-active" : ""}`}
                  onClick={handleUnfiled}
                  aria-current={view === "unfiled" ? "page" : undefined}
                >
                  <span className="sidebar-album-name">Unfiled</span>
                </button>
              </li>
              {albums.map((album) => {
                const isActive = view === "album" && activeAlbumId === album.id;
                return (
                  <li key={album.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`sidebar-album${isActive ? " is-active" : ""}`}
                      onClick={() => handleAlbum(album.id)}
                      onDoubleClick={() => onRenameAlbum(album.id, album.name)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setAlbumMenu({ x: e.clientX, y: e.clientY, album });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleAlbum(album.id);
                        }
                      }}
                      aria-current={isActive ? "page" : undefined}
                      title="Click to open · double-click to rename · right-click for more"
                    >
                      <span className="sidebar-album-name">{album.name}</span>
                      <span className="sidebar-album-count">{album.count}</span>
                      <button
                        type="button"
                        className="sidebar-album-del"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAlbum(album.id, album.name);
                        }}
                        aria-label={`Delete album ${album.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      {albumMenu && (
        <ContextMenu
          x={albumMenu.x}
          y={albumMenu.y}
          items={
            [
              {
                kind: "item",
                label: "Open",
                onSelect: () => handleAlbum(albumMenu.album.id),
              },
              {
                kind: "item",
                label: "Rename",
                onSelect: () =>
                  onRenameAlbum(albumMenu.album.id, albumMenu.album.name),
              },
              { kind: "separator" },
              {
                kind: "item",
                label: "Delete",
                danger: true,
                onSelect: () =>
                  onDeleteAlbum(albumMenu.album.id, albumMenu.album.name),
              },
            ] satisfies ContextMenuItem[]
          }
          onClose={closeAlbumMenu}
        />
      )}
    </>
  );
}
