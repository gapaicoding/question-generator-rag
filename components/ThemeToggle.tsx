"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // ignore: theme preference just won't persist across sessions
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  if (theme === null) return null;

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      className="flex min-h-11 min-w-11 items-center justify-center rounded border border-zinc-500 px-3 text-sm"
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
