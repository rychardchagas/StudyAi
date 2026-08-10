"use client";
import { useCallback, useEffect, useState } from "react";

export type ThemeId = "notion" | "linear" | "raycast" | "claude";
export const DEFAULT_THEME: ThemeId = "notion";
const VALID_THEMES: ThemeId[] = ["notion", "linear", "raycast", "claude"];
export const THEME_STORAGE_KEY = "studyai-theme";

export const THEME_OPTIONS: { id: ThemeId; label: string; description: string }[] = [
  { id: "notion", label: "Notion", description: "Padrão — azul e verde sobre grafite quente" },
  { id: "linear", label: "Linear", description: "Preto quase absoluto, acento índigo" },
  { id: "raycast", label: "Raycast", description: "Vazio azulado escuro, acento vermelho" },
  { id: "claude", label: "Claude", description: "Único tema claro — pergaminho e terracota" },
];

function isValidTheme(value: unknown): value is ThemeId {
  return typeof value === "string" && (VALID_THEMES as string[]).includes(value);
}

// The Notion default has no [data-theme] block in globals.css (it lives on :root), so applying
// it just means removing the attribute rather than setting it to a 4th named value.
function applyTheme(theme: ThemeId) {
  if (theme === DEFAULT_THEME) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // private browsing / storage disabled — theme still applies for this session
  }
}

export function useThemePreference() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const profile = await res.json();
          const saved = profile?.preferences?.theme;
          const next = isValidTheme(saved) ? saved : DEFAULT_THEME;
          setThemeState(next);
          applyTheme(next);
        }
      } catch {
        // keep default
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setTheme = useCallback(async (next: ThemeId) => {
    setThemeState(next);
    applyTheme(next); // instant visual feedback — don't wait on the save round-trip
    try {
      const current = await (await fetch("/api/profile")).json();
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: { ...(current.preferences ?? {}), theme: next },
        }),
      });
    } catch {
      // best-effort — theme still applies locally this session even if the save failed
    }
  }, []);

  return { theme, setTheme, loaded };
}
