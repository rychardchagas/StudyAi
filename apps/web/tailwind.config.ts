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
        bg: "#09090B",
        surface: "#111114",
        card: "#18181C",
        card2: "#1E1E24",
        primary: "#3B82F6",
        secondary: "#8B5CF6",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        muted: "#52525B",
        dim: "#A1A1AA",
        txt: "#F4F4F6",
        border: "rgba(255,255,255,0.07)",
        border2: "rgba(255,255,255,0.13)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
