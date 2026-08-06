"use client";
// Progress / Analytics screen — reference: StudyAI.jsx → screen==="progress"
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Flame, BookOpen, Target, Brain, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityHeatmap } from "@/components/shared/ActivityHeatmap";
import { InsightsList } from "@/components/shared/InsightsList";
import { Button } from "@/components/ui/Button";
import { calcWeeklyAdherence, calcStreakDays, generateInsights } from "@/lib/agents/progress";
import type { Discipline, StudySession } from "@/types";

interface ProgressClientProps {
  initialDisciplines: Discipline[];
  initialSessions: StudySession[];
}

const WEEKS_BACK = 12;

type Period = "4w" | "month" | "semester";

const PERIOD_DAYS: Record<Period, number> = { "4w": 28, month: 30, semester: 182 };
const PERIOD_LABELS: Record<Period, string> = {
  "4w": "Últimas 4 semanas",
  month: "Este mês",
  semester: "Semestre",
};

function ProgressHeader({ period, onPeriodChange }: { period: Period; onPeriodChange: (p: Period) => void }) {
  return (
    <div className="flex items-start justify-between mb-3.5 flex-wrap gap-2">
      <div>
        <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">
          Analytics
        </div>
        <div className="font-serif text-lg font-semibold text-txt">Progresso</div>
      </div>
      <div className="flex gap-2">
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as Period)}
          className="bg-card border border-border rounded-md text-dim text-xs px-2.5 py-1.5 w-[145px] cursor-pointer"
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => toast("Exportação em PDF ainda não implementada.", { icon: "🚧" })}>
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}

export function ProgressClient({ initialDisciplines, initialSessions }: ProgressClientProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("4w");

  const allModules = useMemo(
    () => initialDisciplines.flatMap((d) => d.modules ?? []),
    [initialDisciplines]
  );

  // "Aderência" and "streak" are always current-state metrics (this week / consecutive
  // days) — only the period-scoped stats below (hours, reviews, per-discipline bars)
  // respect the dropdown.
  const completedSessions = useMemo(() => {
    const cutoff = Date.now() - PERIOD_DAYS[period] * 86_400_000;
    return initialSessions.filter((s) => {
      if (!s.completed) return false;
      const at = new Date(s.completed_at ?? s.scheduled_at).getTime();
      return at >= cutoff;
    });
  }, [initialSessions, period]);

  const streak = calcStreakDays(initialSessions);
  const adherence = calcWeeklyAdherence(initialSessions);

  const totalHours = useMemo(() => {
    const minutes = completedSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
    return Math.round((minutes / 60) * 10) / 10;
  }, [completedSessions]);

  const reviewsDone = useMemo(
    () => completedSessions.filter((s) => s.methodology?.includes("Espaçada")).length,
    [completedSessions]
  );

  const insights = useMemo(
    () => generateInsights(initialSessions, allModules),
    [initialSessions, allModules]
  );

  const disciplineCounts = useMemo(() => {
    const counts = initialDisciplines.map((d) => ({
      discipline: d,
      count: completedSessions.filter((s) => s.discipline_id === d.id).length,
    }));
    const max = Math.max(...counts.map((c) => c.count), 1);
    return { counts, max };
  }, [initialDisciplines, completedSessions]);

  if (initialDisciplines.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        <ProgressHeader period={period} onPeriodChange={setPeriod} />
        <EmptyState
          icon={TrendingUp}
          title="Sem dados ainda"
          description="Complete algumas sessões de estudo para ver seu progresso, heatmap e insights dos agentes aqui."
          cta="Ver matérias"
          onCta={() => router.push("/disciplines")}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <ProgressHeader period={period} onPeriodChange={setPeriod} />

      <div className="grid grid-cols-4 gap-2 mb-3.5">
        <StatCard icon={Flame} accent="primary" value={streak} label="dias consecutivos" />
        <StatCard icon={BookOpen} accent="secondary" value={`${totalHours}h`} label="total do período" />
        <StatCard icon={Target} accent="success" value={`${adherence}%`} label="aderência geral" />
        <StatCard icon={Brain} accent="primary" value={reviewsDone} label="revisões feitas" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2 pb-1.5 border-b border-border">
            Mapa de atividade — {WEEKS_BACK} semanas
          </div>
          <ActivityHeatmap sessions={initialSessions} weeksBack={WEEKS_BACK} />
        </div>

        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2 pb-1.5 border-b border-border">
            Sessões por matéria
          </div>
          <div className="flex flex-col gap-2.5">
            {disciplineCounts.counts.map(({ discipline, count }) => (
              <div key={discipline.id} className="flex items-center gap-2.5">
                <span className="text-[11px] text-dim w-[110px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {discipline.name}
                </span>
                <div className="flex-1 h-[5px] bg-card2 rounded-full overflow-hidden">
                  <div
                    className="h-[5px] rounded-full"
                    style={{
                      background: discipline.color,
                      width: `${Math.round((count / disciplineCounts.max) * 100)}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted w-[18px] text-right shrink-0">
                  {count}
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
          emptyText="Continue estudando para desbloquear insights personalizados do Progress Agent."
        />
      </div>
    </div>
  );
}
