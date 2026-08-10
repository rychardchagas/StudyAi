"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Clock,
  Target,
  Repeat,
  Zap,
  BookOpen,
  Brain,
  CalendarClock,
  TrendingUp,
  Bell,
  ShieldCheck,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { useCalendar } from "@/lib/hooks/useCalendar";
import { generateCalendar } from "@/lib/agents/scheduler";
import { useAI } from "@/lib/hooks/useAI";
import { calcWeeklyAdherence, calcStreakDays, countPendingReviews, generateInsights } from "@/lib/agents/progress";
import type { OrchestratorContext } from "@/lib/agents/orchestrator";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityHeatmap } from "@/components/shared/ActivityHeatmap";
import { InsightsList } from "@/components/shared/InsightsList";
import { Button } from "@/components/ui/Button";
import { CalGrid } from "@/components/calendar/CalGrid";
import { EventDrawer } from "@/components/calendar/EventDrawer";
import { GenOverlay } from "@/components/calendar/GenOverlay";
import { startOfWeekMonday, toAvailabilityRecord } from "@/lib/utils/constants";
import type { CalendarEvent, Discipline, StudySession } from "@/types";

interface DashboardClientProps {
  initialDisciplines: Discipline[];
  initialSessions: StudySession[];
  initialAvailability?: Record<number, number[]>;
}

interface Agent {
  name: string;
  description: string;
  Icon: LucideIcon;
  active: boolean;
}

const AGENTS: Agent[] = [
  { name: "Curriculum Agent", description: "Organiza seus módulos a partir do conteúdo enviado", Icon: BookOpen, active: true },
  { name: "Pedagogy Agent", description: "Define metodologia e intervalos de repetição espaçada", Icon: Brain, active: true },
  { name: "Scheduler Agent", description: "Distribui sessões nos seus horários livres", Icon: CalendarClock, active: true },
  { name: "Progress Agent", description: "Acompanha aderência, streaks e gera insights", Icon: TrendingUp, active: true },
  { name: "QA Agent", description: "Valida o calendário antes de entregar", Icon: ShieldCheck, active: true },
  { name: "Notification Agent", description: "Decide lembretes e relatórios locais", Icon: Bell, active: false },
];

const SUGGESTIONS = ["Quanto falta?", "Quiz", "Sobrecarregado"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const HEATMAP_WEEKS_BACK = 8;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DashboardClient({ initialDisciplines, initialSessions, initialAvailability }: DashboardClientProps) {
  const router = useRouter();
  const { disciplines, events, availability, generating, regenerate } = useCalendar(
    initialDisciplines,
    initialAvailability
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [markingDone, setMarkingDone] = useState(false);
  const [showAgents, setShowAgents] = useState(false);

  // `events` (from useCalendar/regenerate, possibly AI-generated) is always this week's plan.
  // Browsing to a different week re-derives it locally with the deterministic scheduler advanced
  // by that many weeks (see generateCalendar's weekIndex) — real progression through the
  // discipline's modules instead of replaying week 0 unchanged, and computed client-side so
  // paging weeks feels instant instead of round-tripping to the AI every click.
  const weekEvents = useMemo(
    () => (weekOffset === 0 ? events : generateCalendar(disciplines, availability, { weekIndex: weekOffset })),
    [weekOffset, events, disciplines, availability]
  );

  const weekDates = useMemo(() => {
    const start = startOfWeekMonday(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const [start, end] = [weekDates[0], weekDates[6]];
    const startLabel = start.getMonth() === end.getMonth() ? `${start.getDate()}` : `${start.getDate()} ${MONTHS[start.getMonth()]}`;
    return `${startLabel}–${end.getDate()} ${MONTHS[end.getMonth()]}, ${end.getFullYear()}`;
  }, [weekDates]);

  const todayLabel = useMemo(
    () => capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())),
    []
  );

  const weeklyAdherence = useMemo(() => calcWeeklyAdherence(initialSessions), [initialSessions]);
  // Week-over-week delta for the stat card below — the other 3 Dashboard stat cards (sessões
  // planejadas, tempo planejado, revisões espaçadas) are forward-looking projections from this
  // week's generated calendar, not historical actuals, so a "vs. last week" comparison wouldn't
  // be a real number for them. Aderência is the one stat here that's genuinely historical.
  const adherenceDelta = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return weeklyAdherence - calcWeeklyAdherence(initialSessions, oneWeekAgo);
  }, [initialSessions, weeklyAdherence]);
  const streakDays = useMemo(() => calcStreakDays(initialSessions), [initialSessions]);
  const allModules = useMemo(() => initialDisciplines.flatMap((d) => d.modules ?? []), [initialDisciplines]);
  const pendingReviews = useMemo(() => countPendingReviews(allModules), [allModules]);
  const insights = useMemo(
    () => generateInsights(initialSessions, allModules, initialDisciplines),
    [initialSessions, allModules, initialDisciplines]
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

  // The calendar is a recurring weekly template (same events every week), so "done" only makes
  // sense tied to a real date — cross-reference against this week's actual completed sessions,
  // and only when the real current week is on screen (weekOffset === 0); past/future weeks have
  // no matching real occurrence to check against.
  const doneEventKeys = useMemo(() => {
    const keys = new Set<string>();
    if (weekOffset !== 0) return keys;
    const weekStart = startOfWeekMonday(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    for (const s of initialSessions) {
      if (!s.completed) continue;
      const at = new Date(s.completed_at ?? s.scheduled_at);
      if (at < weekStart || at >= weekEnd) continue;
      const dow = (at.getDay() + 6) % 7; // Monday=0, matching CalendarEvent.dayOfWeek
      keys.add(`${s.discipline_id}|${s.module_id ?? ""}|${dow}`);
    }
    return keys;
  }, [initialSessions, weekOffset]);

  // A module can also be marked "feito" by hand in Matérias/Kanban — e.g. content the student
  // already knew from before this app, never studied through a real session here. That's a
  // deliberate signal, not an accident: its calendar card should read as concluded too, not just
  // whichever occurrences happen to have a matching study_sessions row this week — including a
  // 🔁 Revisão occurrence, confirmed explicitly: the only real-data case for this is exactly a
  // review slot, and it should read as concluded too. Scoped to the current week only (like
  // doneEventKeys above) — future weeks are a projection, not something to mark done yet.
  const doneModuleIds = useMemo(() => {
    const ids = new Set<string>();
    if (weekOffset !== 0) return ids;
    for (const d of disciplines) {
      for (const m of d.modules ?? []) {
        if (m.status === "done") ids.add(m.id);
      }
    }
    return ids;
  }, [disciplines, weekOffset]);

  const eventsWithDone = useMemo(
    () =>
      weekEvents.map((e) => ({
        ...e,
        done:
          doneEventKeys.has(`${e.disciplineId}|${e.moduleId ?? ""}|${e.dayOfWeek}`) ||
          (!!e.moduleId && doneModuleIds.has(e.moduleId)),
      })),
    [weekEvents, doneEventKeys, doneModuleIds]
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

  async function handleMarkDone(event: CalendarEvent) {
    if (markingDone) return;
    setMarkingDone(true);
    try {
      // Single request: /api/sessions/complete creates the session inline when sessionId is
      // omitted, instead of the old create-then-complete round trip (two sequential awaited
      // fetches for what's really one write) — see the comment on sessionCompleteSchema.
      const res = await fetch("/api/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disciplineId: event.disciplineId,
          moduleId: event.moduleId || undefined,
          scheduledAt: new Date().toISOString(),
          durationMinutes: event.durationMinutes,
          methodology: event.methodology,
          recallScore: 3,
        }),
      });
      if (!res.ok) throw new Error("Failed to complete session");
      toast.success("Sessão marcada como concluída!");
      setSelectedEvent(null);
      router.refresh();
    } catch {
      toast.error("Não foi possível marcar a sessão como concluída.");
    } finally {
      setMarkingDone(false);
    }
  }

  async function handleRegenerate() {
    let availability = initialAvailability;
    let studentContext: string | undefined;
    try {
      const profile = await fetch("/api/profile").then((r) => r.json());
      availability = toAvailabilityRecord(profile?.preferences?.availability) ?? availability;
      // Whatever the student actually told the AI about themselves (onboarding bio, or the
      // dedicated context field) — lets the calendar prompt weigh a stated need/preference
      // instead of only looking at module status and FSRS numbers.
      studentContext = profile?.context || profile?.bio || undefined;
    } catch {
      // fall through with the availability we already have — regenerate() still works with it
    }

    const { usedAI, qaIssues } = await regenerate(disciplines, availability, studentContext);
    if (usedAI) {
      toast.success("Calendário replanejado com IA!");
    } else {
      toast("Calendário atualizado localmente — IA indisponível (verifique se o Ollama está rodando).", {
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
          icon={CalendarDays}
          title="Calendário vazio"
          description="Adicione suas matérias para que o StudyAI gere um calendário personalizado com repetição espaçada e interleaving."
          cta="Ir para Matérias"
          onCta={() => router.push("/disciplines")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <div className="px-5 pt-5 pb-3 flex items-end justify-between gap-4 flex-wrap shrink-0">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted mb-1.5">
            {todayLabel}
          </div>
          <h1 className="font-serif text-2xl font-semibold text-txt leading-tight">Seu painel de estudos</h1>
          <p className="text-sm text-dim mt-1">
            {disciplines.length} {disciplines.length === 1 ? "matéria ativa" : "matérias ativas"}
            {pendingReviews > 0 && ` · ${pendingReviews} ${pendingReviews === 1 ? "revisão pendente" : "revisões pendentes"}`}
          </p>
        </div>
        <Button variant="primary" onClick={handleRegenerate} disabled={generating}>
          <Zap className="w-4 h-4" strokeWidth={2.25} />
          Replanejar
        </Button>
      </div>

      <div className="px-4 pb-3 grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        <StatCard
          icon={CalendarDays}
          accent="secondary"
          value={events.length}
          label="sessões esta semana"
          tooltip="Quantas sessões o calendário distribuiu para esta semana, somando todas as matérias."
        />
        <StatCard
          icon={Clock}
          accent="secondary"
          value={`${hoursPlanned}h`}
          label="tempo planejado"
          tooltip="Soma da duração de todas as sessões planejadas para esta semana."
        />
        <StatCard
          icon={Target}
          accent="success"
          value={`${weeklyAdherence}%`}
          label="aderência"
          delta={adherenceDelta !== 0 ? `${adherenceDelta > 0 ? "+" : ""}${adherenceDelta}% sem.` : undefined}
          deltaDir={adherenceDelta > 0 ? "up" : adherenceDelta < 0 ? "dn" : "neu"}
          tooltip="Das sessões planejadas para esta semana, quantas você já marcou como concluídas. O +/- compara com a semana passada."
        />
        <StatCard
          icon={Repeat}
          accent="primary"
          value={spacedReviews}
          label="revisões espaçadas"
          tooltip="Sessões desta semana que são revisão de conteúdo já estudado (repetição espaçada), não conteúdo novo."
        />
      </div>

      {/* Height used to be a flat xl:h-[580px] — fine for 16 hourly rows (06h–21h), but with the
          calendar expanded to 21 rows (04h–00h) that fixed guess meant a lot more internal scroll
          on typical screens. Tied to the viewport instead (minus roughly what the header/stat
          cards above take), so it actually uses whatever room the screen has instead of a
          one-size guess — clamped so it never gets uncomfortably short/tall on unusual viewports. */}
      <div className="flex flex-col xl:flex-row xl:h-[clamp(420px,calc(100vh-260px),780px)] overflow-hidden mx-4 mb-3.5 border border-border rounded-xl shrink-0">
        <div className="h-[440px] xl:h-auto flex-1 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWeekOffset((p) => p - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-dim cursor-pointer hover:text-txt"
              >
                ‹
              </button>
              <div
                className="text-[13px] font-semibold text-txt min-w-[130px] text-center"
                title="Semanas futuras são projetadas a partir do seu ritmo atual — módulos concluídos e revisões avançam a cada semana."
              >
                {weekLabel}
              </div>
              <button
                type="button"
                onClick={() => setWeekOffset((p) => p + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-dim cursor-pointer hover:text-txt"
              >
                ›
              </button>
              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="font-mono text-[10px] font-semibold text-primary bg-primary/10 border border-primary/25 rounded-md px-2 h-6 cursor-pointer"
                >
                  HOJ
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {disciplines.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center gap-1 text-[11px] text-muted">
                  <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: d.color }} />
                  {d.name.split(" ")[0]}
                </div>
              ))}
            </div>
          </div>
          <CalGrid events={eventsWithDone} onClickEvent={setSelectedEvent} weekDates={weekDates} />
        </div>

        {/* AI Panel — the agent-status list used to render inline (6 rows, permanently eating
            vertical space from the chat); it's now a toggleable popover so the chat gets that
            room back, plus a bit more width. */}
        <div className="relative w-full xl:w-[380px] h-[520px] xl:h-auto shrink-0 bg-surface border-t xl:border-t-0 xl:border-l border-border flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border shrink-0 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-txt">Chat com a IA</div>
              <div className="font-mono text-[9px] text-muted mt-0.5">
                {AGENTS.filter((a) => a.active).length} de {AGENTS.length} agentes ativos
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAgents((p) => !p)}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 font-mono text-[10px] text-dim cursor-pointer hover:text-txt shrink-0"
            >
              <Bot className="w-3 h-3" strokeWidth={2} />
              Agentes
            </button>
          </div>

          {showAgents && (
            <div
              onClick={() => setShowAgents(false)}
              className="absolute inset-0 z-20 bg-black/40 flex items-start justify-end p-3"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[300px] rounded-xl border border-border bg-surface shadow-2xl overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-txt">Agentes de IA</span>
                  <button
                    type="button"
                    onClick={() => setShowAgents(false)}
                    className="w-[20px] h-[20px] rounded-md bg-card border border-border text-muted text-xs flex items-center justify-center cursor-pointer hover:text-txt"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-2 py-1.5 flex flex-col max-h-[70vh] overflow-y-auto">
                  {AGENTS.map((agent) => (
                    <div key={agent.name} className="flex items-start gap-2 px-1.5 py-1.5 rounded-md">
                      <agent.Icon className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" strokeWidth={2} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-txt truncate">{agent.name}</div>
                        <div className="text-[10px] text-muted leading-snug line-clamp-1">{agent.description}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${agent.active ? "bg-secondary" : "bg-muted"}`} />
                        <span className="font-mono text-[8px] uppercase tracking-wide text-muted">
                          {agent.active ? "ativo" : "espera"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="px-3 py-1.5 border-b border-border shrink-0 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
            <span className="text-[10px] text-muted">
              Pergunte ao <span className="text-secondary font-medium">Orchestrator</span>
            </span>
          </div>
          <div className="flex-1 min-h-[80px] overflow-y-auto p-2.5 flex flex-col gap-1.5">
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
          <div className="flex flex-wrap gap-1 px-2.5 pb-1.5 shrink-0">
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
            className="p-2 border-t border-border flex gap-1.5 shrink-0"
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

      <div className="px-4 pb-5 shrink-0">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
          Seu progresso
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mb-2.5">
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2 pb-1.5 border-b border-border">
              Mapa de atividade — {HEATMAP_WEEKS_BACK} semanas
            </div>
            <ActivityHeatmap
              dates={initialSessions.filter((s) => s.completed).map((s) => s.completed_at ?? s.scheduled_at)}
              weeksBack={HEATMAP_WEEKS_BACK}
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2 pb-1.5 border-b border-border">
              Progresso por matéria
            </div>
            <div className="flex flex-col gap-2.5">
              {disciplines.map((d) => (
                <div key={d.id} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-dim w-[110px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {d.name}
                  </span>
                  <div className="flex-1 h-[5px] bg-card2 rounded-full overflow-hidden">
                    <div className="h-[5px] rounded-full" style={{ background: d.color, width: `${d.progress}%` }} />
                  </div>
                  <span className="font-mono text-[10px] text-muted w-[30px] text-right shrink-0">
                    {d.progress}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2 pb-1.5 border-b border-border">
            Insights dos agentes
          </div>
          <InsightsList
            insights={insights}
            emptyText="Continue estudando para desbloquear insights personalizados dos agentes."
          />
        </div>
      </div>

      <EventDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onStartSession={handleStartSession}
        onMarkDone={handleMarkDone}
        markingDone={markingDone}
      />
      <GenOverlay visible={generating} />
    </div>
  );
}
