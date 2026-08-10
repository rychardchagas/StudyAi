import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutrals + accents share one CSS-var source of truth (globals.css :root) so the
        // palette is never hand-duplicated between here and there — see docs/ui-ux notes.
        bg: "oklch(var(--bg))",
        surface: "oklch(var(--surface))",
        card: "oklch(var(--card))",
        card2: "oklch(var(--card2))",
        border: "oklch(var(--border))",
        border2: "oklch(var(--border2))",
        txt: "oklch(var(--txt))",
        dim: "oklch(var(--dim))",
        muted: "oklch(var(--muted))",
        // Blue (Notion-inspired) — gamification: streak, XP, primary actions.
        primary: "oklch(var(--primary) / <alpha-value>)",
        // Green (Notion-inspired) — AI/agent elements. Same L/C as primary, different hue.
        secondary: "oklch(var(--secondary) / <alpha-value>)",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
