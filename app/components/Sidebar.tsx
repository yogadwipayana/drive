"use client";

import { useCallback, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import {
  HomeIcon,
  TrashIcon,
  FolderIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  OpenInNewIcon,
  RefreshIcon,
  RenameIcon,
} from "./icons";

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
  onRefresh: () => void;
  onEmptyTrash: () => void;
  onCloseMobile: () => void;
};

type SidebarMenuKind =
  | { kind: "home" }
  | { kind: "trash" }
  | { kind: "unfiled" }
  | { kind: "albums" }
  | { kind: "album"; album: Album };

type SidebarMenu = SidebarMenuKind & { x: number; y: number };

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
  onRefresh,
  onEmptyTrash,
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

  const [menu, setMenu] = useState<SidebarMenu | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const openMenu = useCallback((e: ReactMouseEvent, m: SidebarMenuKind) => {
    e.preventDefault();
    setMenu({ ...m, x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <div className="sidebar-backdrop" onClick={onCloseMobile} />
      <aside className={`sidebar${mobileOpen ? " is-open" : ""}`}>

        {/* Brand row */}
        <div className="sidebar-brand">
          <svg
            className="sidebar-logo-mark"
            width="28"
            height="28"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="8" fill="#1a73e8" />
            <path
              d="M7 23l5.5-7 4 5 4-6 4.5 8H7z"
              stroke="#ffffff"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle
              cx="11.5"
              cy="12"
              r="1.75"
              stroke="#ffffff"
              strokeWidth="1.75"
              fill="none"
            />
          </svg>
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-name">Vista</span>
          </span>
        </div>

        {/* + New button */}
        <button
          type="button"
          className="sidebar-new-btn"
          onClick={onCreateAlbum}
          aria-label="New album"
        >
          <span className="sidebar-new-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285f4" d="M11 3h2v8h-2z"/>
              <path fill="#34a853" d="M13 11h8v2h-8z"/>
              <path fill="#fbbc04" d="M11 13h2v8h-2z"/>
              <path fill="#ea4335" d="M3 11h8v2H3z"/>
            </svg>
          </span>
          New
        </button>

        {/* Nav links */}
        <nav aria-label="Main navigation">
          <ul className="sidebar-nav">
            <li>
              <button
                type="button"
                className={`sidebar-link${view === "home" ? " is-active" : ""}`}
                onClick={handleHome}
                onContextMenu={(e) => openMenu(e, { kind: "home" })}
                aria-current={view === "home" ? "page" : undefined}
              >
                <HomeIcon size={20} />
                Home
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-link${view === "trash" ? " is-active" : ""}`}
                onClick={handleTrash}
                onContextMenu={(e) => openMenu(e, { kind: "trash" })}
                aria-current={view === "trash" ? "page" : undefined}
              >
                <TrashIcon size={20} />
                Trash
              </button>
            </li>
          </ul>
        </nav>

        {/* Divider */}
        <hr className="sidebar-section-divider" />

        {/* Albums section */}
        <div
          className="sidebar-albums-section"
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest(".sidebar-album")) return;
            openMenu(e, { kind: "albums" });
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              className="sidebar-section-header"
              onClick={onToggleAlbumsExpanded}
              aria-expanded={albumsExpanded}
            >
              <span className={`sidebar-chevron${albumsExpanded ? " is-expanded" : ""}`}>
                {albumsExpanded ? (
                  <ChevronDownIcon size={16} />
                ) : (
                  <ChevronRightIcon size={16} />
                )}
              </span>
              Albums
            </button>
            <button
              type="button"
              className="sidebar-add-btn"
              onClick={onCreateAlbum}
              aria-label="Create new album"
            >
              <PlusIcon size={16} />
            </button>
          </div>

          {albumsExpanded && (
            <ul className="sidebar-album-list">
              {/* Unfiled */}
              <li>
                <div
                  role="button"
                  tabIndex={0}
                  className={`sidebar-album${view === "unfiled" ? " is-active" : ""}`}
                  onClick={handleUnfiled}
                  onContextMenu={(e) => openMenu(e, { kind: "unfiled" })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleUnfiled();
                    }
                  }}
                  aria-current={view === "unfiled" ? "page" : undefined}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6, opacity: 0.7 }}>
                    <FolderIcon size={16} />
                  </span>
                  <span className="sidebar-album-name">Unfiled</span>
                </div>
              </li>

              {/* Albums */}
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
                      onContextMenu={(e) => openMenu(e, { kind: "album", album })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleAlbum(album.id);
                        }
                      }}
                      aria-current={isActive ? "page" : undefined}
                      title="Click to open · double-click to rename · right-click for more"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6, opacity: 0.7 }}>
                        <FolderIcon size={16} />
                      </span>
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

        {/* Storage usage */}
        <div className="sidebar-storage">
          <div className="sidebar-storage-bar"><div className="sidebar-storage-fill" style={{ width: "20%" }} /></div>
          <div className="sidebar-storage-text">3 GB of 15 GB used</div>
        </div>
      </aside>

      {/* Context menus */}
      {menu &&
        (() => {
          let items: ContextMenuItem[] = [];

          if (menu.kind === "home") {
            items = [
              { kind: "item", label: "Open", icon: <OpenInNewIcon size={16} />, onSelect: handleHome },
              { kind: "item", label: "Refresh", icon: <RefreshIcon size={16} />, onSelect: onRefresh },
              { kind: "separator" },
              { kind: "item", label: "New album", icon: <PlusIcon size={16} />, onSelect: onCreateAlbum },
            ];
          } else if (menu.kind === "trash") {
            items = [
              { kind: "item", label: "Open", icon: <OpenInNewIcon size={16} />, onSelect: handleTrash },
              { kind: "item", label: "Refresh", icon: <RefreshIcon size={16} />, onSelect: onRefresh },
              { kind: "separator" },
              {
                kind: "item",
                label: "Empty trash",
                icon: <TrashIcon size={16} />,
                danger: true,
                onSelect: onEmptyTrash,
              },
            ];
          } else if (menu.kind === "unfiled") {
            items = [
              { kind: "item", label: "Open", icon: <OpenInNewIcon size={16} />, onSelect: handleUnfiled },
              { kind: "item", label: "Refresh", icon: <RefreshIcon size={16} />, onSelect: onRefresh },
              { kind: "separator" },
              { kind: "item", label: "New album", icon: <PlusIcon size={16} />, onSelect: onCreateAlbum },
            ];
          } else if (menu.kind === "albums") {
            items = [
              { kind: "item", label: "New album", icon: <PlusIcon size={16} />, onSelect: onCreateAlbum },
              {
                kind: "item",
                label: albumsExpanded ? "Collapse" : "Expand",
                icon: albumsExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />,
                onSelect: onToggleAlbumsExpanded,
              },
              { kind: "separator" },
              { kind: "item", label: "Refresh", icon: <RefreshIcon size={16} />, onSelect: onRefresh },
            ];
          } else if (menu.kind === "album") {
            const a = menu.album;
            items = [
              { kind: "item", label: "Open", icon: <OpenInNewIcon size={16} />, onSelect: () => handleAlbum(a.id) },
              { kind: "item", label: "Rename", icon: <RenameIcon size={16} />, onSelect: () => onRenameAlbum(a.id, a.name) },
              { kind: "separator" },
              {
                kind: "item",
                label: "Delete",
                icon: <TrashIcon size={16} />,
                danger: true,
                onSelect: () => onDeleteAlbum(a.id, a.name),
              },
            ];
          }

          return (
            <ContextMenu
              x={menu.x}
              y={menu.y}
              items={items}
              onClose={closeMenu}
            />
          );
        })()}
    </>
  );
}
