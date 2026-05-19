"use client";

import { useEffect, useId, useRef, useState } from "react";

export type DropdownOption<V extends string = string> = {
  value: V;
  label: React.ReactNode;
};

type DropdownProps<V extends string = string> = {
  value: V;
  onChange: (value: V) => void;
  options: DropdownOption<V>[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
  className?: string;
};

export function Dropdown<V extends string = string>({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  size = "md",
  ariaLabel,
  className,
}: DropdownProps<V>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef<string>("");
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const listboxId = `dd-listbox-${id}`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const displayLabel = selectedOption ? selectedOption.label : placeholder ?? "";

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    const idx = selectedIndex >= 0 ? selectedIndex : 0;
    setHighlighted(idx);
  }

  function closeDropdown() {
    setOpen(false);
    setHighlighted(-1);
  }

  function selectOption(idx: number) {
    if (idx < 0 || idx >= options.length) return;
    onChange(options[idx].value);
    closeDropdown();
    triggerRef.current?.focus();
  }

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || highlighted < 0) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) {
          if (highlighted >= 0) selectOption(highlighted);
          else closeDropdown();
        } else {
          openDropdown();
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          openDropdown();
        } else {
          setHighlighted((h) => Math.min(h + 1, options.length - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) {
          openDropdown();
        } else {
          setHighlighted((h) => Math.max(h - 1, 0));
        }
        break;
      case "Home":
        e.preventDefault();
        if (open) setHighlighted(0);
        break;
      case "End":
        e.preventDefault();
        if (open) setHighlighted(options.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      default: {
        // Typeahead: accumulate chars, jump to next matching option
        if (e.key.length === 1) {
          e.preventDefault();
          if (!open) openDropdown();
          const char = e.key.toLowerCase();
          typeaheadRef.current += char;
          if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
          typeaheadTimerRef.current = setTimeout(() => {
            typeaheadRef.current = "";
          }, 500);
          const buf = typeaheadRef.current;
          // Search from after current highlight, wrap around
          const start = highlighted >= 0 ? highlighted + 1 : 0;
          const rotated = [...options.slice(start), ...options.slice(0, start)];
          const match = rotated.findIndex((o) =>
            String(o.label).toLowerCase().startsWith(buf),
          );
          if (match >= 0) {
            const realIdx = (start + match) % options.length;
            setHighlighted(realIdx);
          }
        }
      }
    }
  }

  const sizeClass = size === "sm" ? " dd-trigger-sm" : "";
  const disabledClass = disabled ? " dd-disabled" : "";
  const openClass = open ? " dd-open" : "";

  return (
    <div
      ref={containerRef}
      className={`dd-root${className ? ` ${className}` : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        disabled={disabled}
        className={`dd-trigger${sizeClass}${disabledClass}${openClass}`}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="dd-trigger-label">{displayLabel}</span>
        <svg
          className={`dd-chevron${open ? " dd-chevron-open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="dd-panel"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlighted;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`dd-option${isSelected ? " dd-option-selected" : ""}${isHighlighted ? " dd-option-highlighted" : ""}`}
                onMouseDown={(e) => {
                  // prevent blur on trigger before click registers
                  e.preventDefault();
                  selectOption(idx);
                }}
                onMouseEnter={() => setHighlighted(idx)}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
