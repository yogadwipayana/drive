"use client";

import { Dropdown } from "./Dropdown";

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
  title: string;
  count: number;
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
  title,
  count,
}: TopbarProps) {
  return (
    <header className="topbar">
      <button
        className="topbar-menu-btn"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect y="3" width="18" height="2" fill="currentColor" />
          <rect y="8" width="18" height="2" fill="currentColor" />
          <rect y="13" width="18" height="2" fill="currentColor" />
        </svg>
      </button>

      <div className="topbar-title-block">
        <span className="topbar-title">{title}</span>
        {count > 0 && <span className="topbar-count">{count}</span>}
      </div>

      <div className="topbar-spacer" />

      <input
        className="topbar-search"
        type="search"
        placeholder="Search by filename…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />

      <div className="topbar-sort">
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

      <button
        className={`btn${selecting ? " btn-active" : ""}`}
        onClick={onToggleSelecting}
      >
        {selecting ? "Done" : "Select"}
      </button>
    </header>
  );
}
