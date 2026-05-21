"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "light" | "dark";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored =
      typeof window !== "undefined"
        ? (localStorage.getItem("theme") as Theme | null)
        : null;
    const initial: Theme =
      stored ??
      (typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore
    }
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className={`topbar-icon-btn${className ? ` ${className}` : ""}`}
        aria-label="Toggle theme"
      >
        <SunIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`topbar-icon-btn${className ? ` ${className}` : ""}`}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      onClick={toggle}
      title={theme === "light" ? "Dark theme" : "Light theme"}
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
