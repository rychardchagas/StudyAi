import type { Metadata } from "next";
import { Inter, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { UnloadOnClose } from "@/components/shared/UnloadOnClose";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${sourceSerif.variable} ${plexMono.variable} font-sans`}>
        {children}
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
