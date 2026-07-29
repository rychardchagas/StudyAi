"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCalendar } from "@/lib/hooks/useCalendar";
import { useAI } from "@/lib/hooks/useAI";
import { calcWeeklyAdherence, calcStreakDays, countPendingReviews } from "@/lib/agents/progress";
import type { OrchestratorContext } from "@/lib/agents/orchestrator";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { CalGrid } from "@/components/calendar/CalGrid";
import { EventDrawer } from "@/components/calendar/EventDrawer";
import { GenOverlay } from "@/components/calendar/GenOverlay";
import { toAvailabilityRecord } from "@/lib/utils/constants";
import type { CalendarEvent, Discipline, StudySession } from "@/types";

interface DashboardClientProps {
  initialDisciplines: Discipline[];
  initialSessions: StudySession[];
  initialAvailability?: Record<number, number[]>;
}

const SUGGESTIONS = ["⏱ Quanto falta?", "🧠 Quiz", "😓 Sobrecarregado"];

export function DashboardClient({ initialDisciplines, initialSessions, initialAvailability }: DashboardClientProps) {
  const router = useRouter();
  const { disciplines, events, generating, regenerate } = useCalendar(initialDisciplines, initialAvailability);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [chatInput, setChatInput] = useState("");

  const weeklyAdherence = useMemo(() => calcWeeklyAdherence(initialSessions), [initialSessions]);
  const streakDays = useMemo(() => calcStreakDays(initialSessions), [initialSessions]);
  const pendingReviews = useMemo(
    () => countPendingReviews(initialDisciplines.flatMap((d) => d.modules ?? [])),
    [initialDisciplines]
  );

  const orchestratorContext: OrchestratorContext = useMemo(
    () => ({
      disciplines: disciplines.map((d) => ({
        name: d.name,
        horas: d.horas_semana,
        prioridade: d.prioridade,
        examDate: d.exam_date ?? undefined,
      })),
      weeklyAdherence,
      streakDays,
      pendingReviews,
    }),
    [disciplines, weeklyAdherence, streakDays, pendingReviews]
  );

  const { messages, loading, send } = useAI(orchestratorContext);

  const hoursPlanned = useMemo(() => {
    const total = events.reduce((sum, e) => sum + e.durationMinutes, 0) / 60;
    return Math.round(total * 10) / 10;
  }, [events]);

  const spacedReviews = useMemo(
    () => events.filter((e) => e.methodology.includes("Espaçada")).length,
    [events]
  );

  function handleStartSession(event: CalendarEvent) {
    router.push(
      `/session?disciplineId=${event.disciplineId}&moduleId=${event.moduleId ?? ""}&methodology=${encodeURIComponent(
        event.methodology
      )}&duration=${event.durationMinutes}&disciplineName=${encodeURIComponent(
        event.disciplineName
      )}&moduleName=${encodeURIComponent(event.moduleName)}`
    );
  }

  async function handleRegenerate() {
    let availability = initialAvailability;
    try {
      const profile = await fetch("/api/profile").then((r) => r.json());
      availability = toAvailabilityRecord(profile?.preferences?.availability) ?? availability;
    } catch {
      // fall through with the availability we already have — regenerate() still works with it
    }

    const { usedAI, qaIssues } = await regenerate(disciplines, availability);
    if (usedAI) {
      toast.success("Calendário replanejado com IA!");
    } else {
      toast("Calendário atualizado localmente — IA indisponível (verifique a chave/crédito da Anthropic).", {
        icon: "⚠️",
      });
    }
    qaIssues.forEach((issue) => toast.error(issue, { duration: 6000 }));
  }

  function handleSend(content: string) {
    if (!content.trim()) return;
    send(content.trim());
  }

  if (initialDisciplines.length === 0) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <EmptyState
          icon="📅"
          title="Calendário vazio"
          description="Adicione suas matérias para que o StudyAI gere um calendário personalizado com repetição espaçada e interleaving."
          cta="Ir para Matérias"
          onCta={() => router.push("/disciplines")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-4 pt-2.5 pb-2 grid grid-cols-4 gap-2 shrink-0">
        <StatCard icon="📅" iconBg="rgba(59,130,246,.12)" value={events.length} label="sessões esta semana" />
        <StatCard icon="⏱" iconBg="rgba(139,92,246,.12)" value={`${hoursPlanned}h`} label="tempo planejado" />
        <StatCard icon="✅" iconBg="rgba(34,197,94,.1)" value={`${weeklyAdherence}%`} label="aderência" />
        <StatCard icon="🔁" iconBg="rgba(245,158,11,.1)" value={spacedReviews} label="revisões espaçadas" />
      </div>

      <div className="flex flex-1 overflow-hidden mx-4 mb-3.5 border border-border rounded-xl">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {disciplines.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center gap-1 text-[11px] text-muted">
                  <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: d.color }} />
                  {d.name.split(" ")[0]}
                </div>
              ))}
            </div>
            <Button variant="primary" size="sm" onClick={handleRegenerate} disabled={generating}>
              ⚡ Replanejar
            </Button>
          </div>
          <CalGrid events={events} onClickEvent={setSelectedEvent} />
        </div>

        {/* AI Panel */}
        <div className="w-[245px] shrink-0 bg-surface border-l border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
            <div>
              <div className="text-xs font-semibold text-txt">Assistente IA</div>
              <div className="font-mono text-[9px] text-muted">Orchestrator · ativo</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5">
            {messages.map((m, i) => (
              <div key={i}>
                <div
                  className={`font-mono text-[9px] font-semibold tracking-wider uppercase mb-0.5 ${
                    m.role === "assistant" ? "text-secondary" : "text-primary text-right"
                  }`}
                >
                  {m.role === "assistant" ? "StudyAI" : "Você"}
                </div>
                <div
                  className={`text-[11px] leading-relaxed px-2 py-1.5 rounded-lg whitespace-pre-wrap ${
                    m.role === "assistant"
                      ? "bg-card border border-border text-txt"
                      : "bg-primary/10 border border-primary/20 text-txt text-right"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-[11px] text-muted">StudyAI está digitando…</div>}
          </div>
          <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                disabled={loading}
                className="text-[10px] text-muted bg-card border border-border rounded-full px-1.5 py-0.5 cursor-pointer hover:text-txt transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(chatInput);
              setChatInput("");
            }}
            className="p-2 border-t border-border flex gap-1.5"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pergunte algo…"
              className="flex-1 bg-card2 border border-border rounded-lg px-2 py-1.5 text-xs text-txt outline-none"
            />
            <Button type="submit" variant="primary" size="sm" disabled={loading || !chatInput.trim()}>
              →
            </Button>
          </form>
        </div>
      </div>

      <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} onStartSession={handleStartSession} />
      <GenOverlay visible={generating} />
    </div>
  );
}
