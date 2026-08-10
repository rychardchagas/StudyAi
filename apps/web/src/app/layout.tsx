import type { Metadata } from "next";
import { Inter, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { UnloadOnClose } from "@/components/shared/UnloadOnClose";
import { ThemeBootstrap } from "@/components/shared/ThemeBootstrap";
import { THEME_STORAGE_KEY } from "@/lib/hooks/useThemePreference";
import "./globals.css";

// Runs before hydration so a saved theme applies with no flash-of-default-theme. Reads only from
// localStorage (never user input) and checks against a fixed whitelist before touching the DOM.
const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t&&["linear","raycast","claude"].indexOf(t)!==-1){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

// Sans for UI copy, serif for editorial headings, mono for stats/numbers — each exposed as a
// CSS variable and wired into the `sans`/`serif`/`mono` keys in tailwind.config.ts.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "StudyAI — Calendário de Estudos Inteligente",
  description: "Plataforma de estudos com IA, repetição espaçada e interleaving adaptativo.",
  icons: {
    // icon.svg (this directory) covers every other size via Next's file convention — this entry
    // only adds a 16px-specific variant (two cards, no inner line detail) for browser tabs, where
    // the full 3-card version's thin lines wash out. Browsers prefer an exact `sizes` match over
    // the unsized file-convention icon when both are present.
    icon: [{ url: "/favicon-16.svg", sizes: "16x16", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${sourceSerif.variable} ${plexMono.variable} font-sans`}>
        {children}
        <ThemeBootstrap />
        <UnloadOnClose />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "oklch(var(--card))",
              color: "oklch(var(--txt))",
              border: "1px solid oklch(var(--border))",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
