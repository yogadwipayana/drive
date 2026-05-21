"use client";

import { useEffect, useRef, useState } from "react";
import { Dropdown } from "./Dropdown";
import { MenuIcon, SearchIcon, SortIcon } from "./icons";

type SortKey = "date" | "name" | "size";
type Order = "asc" | "desc";

type TopbarProps = {
  query: string;
  onQueryChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  order: Order;
  onOrderChange: (o: Order) => void;
  selecting: boolean;
  onToggleSelecting: () => void;
  onOpenMobileMenu: () => void;
  userEmail: string;
};

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "name", label: "Name" },
  { value: "size", label: "Size" },
];

const ORDER_OPTIONS = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];

export function Topbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  order,
  onOrderChange,
  selecting,
  onToggleSelecting,
  onOpenMobileMenu,
  userEmail,
}: TopbarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sort popover on outside click
  useEffect(() => {
    if (!sortOpen) return;
    function handler(e: MouseEvent) {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(e.target as Node) &&
        sortBtnRef.current &&
        !sortBtnRef.current.contains(e.target as Node)
      ) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  return (
    <header className="topbar">
      {/* Mobile hamburger — CSS hides this on wider viewports */}
      <button
        type="button"
        className="topbar-menu-btn"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      {/* Search field — centered */}
      <div className="topbar-search-wrap">
        <span className="topbar-search-icon">
          <SearchIcon />
        </span>
        <input
          className="topbar-search"
          type="search"
          placeholder="Search in Drive"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* Right-side actions */}
      <div className="topbar-actions">
        {/* Sort popover trigger */}
        <div className="topbar-sort" style={{ position: "relative" }}>
          <button
            ref={sortBtnRef}
            type="button"
            className="topbar-icon-btn"
            aria-label="Sort options"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((v) => !v)}
          >
            <SortIcon />
          </button>
          {sortOpen && (
            <div ref={sortMenuRef} className="topbar-sort-menu">
              <Dropdown
                value={sort}
                onChange={(v) => onSortChange(v as SortKey)}
                options={SORT_OPTIONS}
                ariaLabel="Sort by"
                size="sm"
              />
              <Dropdown
                value={order}
                onChange={(v) => onOrderChange(v as Order)}
                options={ORDER_OPTIONS}
                ariaLabel="Order"
                size="sm"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          className={`btn btn-sm${selecting ? " btn-active" : ""}`}
          onClick={onToggleSelecting}
        >
          {selecting ? "Done" : "Select"}
        </button>

        {/* Account avatar */}
        <div
          className="topbar-avatar"
          title={userEmail}
          aria-label={`Account: ${userEmail}`}
        >
          {userEmail[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
