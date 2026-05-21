"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type ContextMenuItem =
  | {
      kind: "item";
      label: string;
      onSelect: () => void;
      icon?: ReactNode;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
    }
  | { kind: "separator" }
  | {
      kind: "submenu";
      label: string;
      icon?: ReactNode;
      options: { value: string; label: string }[];
      onSelect: (value: string) => void;
    };

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [submenuOpen, setSubmenuOpen] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nx = x + rect.width > vw ? Math.max(4, vw - rect.width - 4) : x;
    const ny = y + rect.height > vh ? Math.max(4, vh - rect.height - 4) : y;
    if (nx !== pos.x || ny !== pos.y) setPos({ x: nx, y: ny });
  }, [pos.x, pos.y, x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      className="ctx-menu"
      style={{ top: pos.y, left: pos.x }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if (item.kind === "separator") {
          return <div key={`sep-${i}`} className="ctx-sep" />;
        }
        if (item.kind === "submenu") {
          const open = submenuOpen === i;
          return (
            <div
              key={`sub-${i}`}
              className="ctx-row ctx-submenu-row"
              onMouseEnter={() => setSubmenuOpen(i)}
              onMouseLeave={() =>
                setSubmenuOpen((cur) => (cur === i ? null : cur))
              }
            >
              <span className="ctx-row-icon">{item.icon ?? null}</span>
              <span className="ctx-row-label">{item.label}</span>
              <span className="ctx-submenu-arrow">›</span>
              {open && (
                <div className="ctx-submenu">
                  {item.options.length === 0 ? (
                    <div className="ctx-row ctx-row-disabled">
                      <span className="ctx-row-icon" />
                      <span className="ctx-row-label">No options</span>
                    </div>
                  ) : (
                    item.options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className="ctx-row"
                        onClick={() => {
                          item.onSelect(opt.value);
                          onClose();
                        }}
                      >
                        <span className="ctx-row-icon" />
                        <span className="ctx-row-label">{opt.label}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        }
        return (
          <button
            key={`it-${i}`}
            type="button"
            role="menuitem"
            className={`ctx-row${item.danger ? " ctx-row-danger" : ""}`}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect();
              onClose();
            }}
          >
            <span className="ctx-row-icon">{item.icon ?? null}</span>
            <span className="ctx-row-label">{item.label}</span>
            {item.shortcut && (
              <span className="ctx-row-shortcut">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
