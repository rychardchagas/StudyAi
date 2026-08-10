"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Repeat, CalendarClock, CheckCircle2 } from "lucide-react";
import type { Discipline } from "@/types";

interface UpcomingExam {
  name: string;
  days: number;
}

interface TopbarProps {
  disciplines: Discipline[];
  profileName: string | null;
  pendingReviews: number;
  upcomingExams: UpcomingExam[];
}

const LABELS: Record<string, string> = {
  "/dashboard": "Calendário",
  "/session": "Sessão ativa",
  "/progress": "Progresso",
  "/disciplines": "Matérias",
  "/methods": "Metodologias",
  "/settings": "Configurações",
  "/agents": "Agentes de IA",
  "/help": "Como usar",
};

function examLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

export function Topbar({ disciplines, profileName, pendingReviews, upcomingExams }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const title = LABELS[pathname] ?? "";
  const sub = pathname === "/disciplines" ? `${disciplines.length} matérias` : undefined;
  const [open, setOpen] = useState(false);

  const initial = (profileName?.trim()?.[0] ?? "U").toUpperCase();
  const hasPending = pendingReviews > 0 || upcomingExams.length > 0;

  return (
    <div className="h-12 bg-surface border-b border-border flex items-center px-5 gap-2 shrink-0">
      <span className="font-serif text-[15px] font-semibold text-txt">{title}</span>
      {sub && <span className="text-[11px] text-muted ml-1">{sub}</span>}
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            title="Notificações"
            className="relative w-7 h-7 rounded-md bg-card border border-border text-dim cursor-pointer flex items-center justify-center hover:text-txt transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            {hasPending && (
              <span className="absolute top-[3px] right-[3px] w-[7px] h-[7px] rounded-full bg-primary border border-surface" />
            )}
          </button>

          {open && (
            <>
              {/* Same click-outside-to-close pattern as the Agentes popover on the Dashboard. */}
              <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[300px] rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-xs font-semibold text-txt">Notificações</span>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {!hasPending && (
                    <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      Tudo em dia — nenhuma pendência agora.
                    </div>
                  )}
                  {pendingReviews > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push("/dashboard");
                      }}
                      className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-card2 transition-colors border-b border-border/60"
                    >
                      <Repeat className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" strokeWidth={2} />
                      <span className="text-[11px] text-dim leading-snug">
                        <strong className="text-txt font-medium">
                          {pendingReviews} {pendingReviews === 1 ? "revisão espaçada" : "revisões espaçadas"}
                        </strong>{" "}
                        pendente{pendingReviews === 1 ? "" : "s"} — o FSRS já passou da data.
                      </span>
                    </button>
                  )}
                  {upcomingExams.map((exam) => (
                    <button
                      key={exam.name}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push("/disciplines");
                      }}
                      className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-card2 transition-colors border-b border-border/60 last:border-b-0"
                    >
                      <CalendarClock
                        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${exam.days <= 3 ? "text-danger" : "text-warning"}`}
                        strokeWidth={2}
                      />
                      <span className="text-[11px] text-dim leading-snug">
                        Prova de <strong className="text-txt font-medium">{exam.name}</strong> {examLabel(exam.days)}.
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push("/settings")}
          title={profileName ? `${profileName} — abrir Configurações` : "Abrir Configurações"}
          className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-bg cursor-pointer"
        >
          {initial}
        </button>
      </div>
    </div>
  );
}
