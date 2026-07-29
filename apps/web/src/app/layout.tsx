import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#18181C",
              color: "#F4F4F6",
              border: "1px solid rgba(255,255,255,.07)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
