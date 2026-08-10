"use client";
import { useThemePreference } from "@/lib/hooks/useThemePreference";

// Mounted once near the app root — applies the saved [data-theme] on every page load. The inline
// script in layout.tsx's <head> already applied the last-known theme from localStorage before
// paint (no flash); this reconciles it with the authoritative value from /api/profile.
export function ThemeBootstrap() {
  useThemePreference();
  return null;
}
