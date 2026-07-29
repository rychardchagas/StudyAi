"use client";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import type { Discipline } from "@/types";

interface TopbarProps {
  disciplines: Discipline[];
}

const LABELS: Record<string, string> = {
  "/dashboard": "Calendário",
  "/session": "Sessão ativa",
  "/progress": "Progresso",
  "/disciplines": "Matérias",
  "/methods": "Metodologias",
  "/settings": "Configurações",
};

export function Topbar({ disciplines }: TopbarProps) {
  const pathname = usePathname();
  const title = LABELS[pathname] ?? "";
  const sub = pathname === "/disciplines" ? `${disciplines.length} matérias` : undefined;

  return (
    <div className="h-12 bg-surface border-b border-border flex items-center px-5 gap-2 shrink-0">
      <span className="text-sm font-semibold text-txt">{title}</span>
      {sub && <span className="text-[11px] text-muted ml-1">{sub}</span>}
      <div className="ml-auto flex items-center gap-2">
        {pathname === "/dashboard" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => toast.success("Gerando calendário… ✦")}
          >
            ⚡ Replanejar
          </Button>
        )}
        <button
          onClick={() => toast("Sem novas notificações")}
          className="w-7 h-7 rounded-md bg-card border border-border text-dim cursor-pointer text-[13px] flex items-center justify-center"
        >
          🔔
        </button>
        <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-white cursor-pointer">
          U
        </div>
      </div>
    </div>
  );
}
