"use client";

import { Dropdown } from "./Dropdown";
import { MenuIcon, SearchIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

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
      {/* Mobile hamburger — CSS hides this on wider viewports */}
      <button
        type="button"
        className="topbar-menu-btn"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      {/* Section title — CSS hides this on narrow viewports */}
      <div className="topbar-title-block">
        <span className="topbar-title">{title}</span>
        {count > 0 && <span className="topbar-count">{count}</span>}
      </div>

      {/* Search field */}
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
          type="button"
          className={`btn btn-sm${selecting ? " btn-active" : ""}`}
          onClick={onToggleSelecting}
        >
          {selecting ? "Done" : "Select"}
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
