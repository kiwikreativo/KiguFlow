import { Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "kiguflow-theme";
const THEME_EVENT = "kiguflow:theme-change";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#010a04" : "#f4f2e9");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The theme still applies when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const sync = (event: Event) => {
      const next = (event as CustomEvent<Theme>).detail ?? currentTheme();
      setTheme(next);
    };
    window.addEventListener(THEME_EVENT, sync);
    setTheme(currentTheme());
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const choose = (next: Theme) => {
    applyTheme(next);
    setTheme(next);
  };

  return (
    <div
      className={`theme-toggle ${className}`}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        aria-label="Use light theme"
        aria-pressed={theme === "light"}
        onClick={() => choose("light")}
      >
        <Sun size={16} weight="bold" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Use dark theme"
        aria-pressed={theme === "dark"}
        onClick={() => choose("dark")}
      >
        <Moon size={16} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
