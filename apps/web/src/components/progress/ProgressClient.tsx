"use client";
// Progress / Analytics screen — reference: StudyAI.jsx → screen==="progress"
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { calcWeeklyAdherence, calcStreakDays, generateInsights } from "@/lib/agents/progress";
import { startOfWeekMonday } from "@/lib/utils/constants";
import type { Discipline, StudySession } from "@/types";

interface ProgressClientProps {
  initialDisciplines: Discipline[];
  initialSessions: StudySession[];
}

// 5-step green intensity scale, reimplemented from prototype's `hmCols`
const HEATMAP_COLORS = [
  "rgba(255,255,255,.06)",
  "rgba(34,197,94,.18)",
  "rgba(34,197,94,.4)",
  "rgba(34,197,94,.65)",
  "#22C55E",
];
const DAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg Ter Qua Qui Sex Sáb Dom
const WEEKS_BACK = 12;

const BLUE_D = "rgba(59,130,246,.12)";
const LAV_D = "rgba(139,92,246,.12)";
const GRN_D = "rgba(34,197,94,.1)";
const AMB_D = "rgba(245,158,11,.1)";

function heatLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

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
        <div className="text-lg font-bold text-txt">Progresso</div>
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

  const heatmapWeeks = useMemo(() => {
    const countsByDay = new Map<string, number>();
    for (const s of completedSessions) {
      const at = s.completed_at ?? s.scheduled_at;
      if (!at) continue;
      const key = new Date(at).toDateString();
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const currentWeekStart = startOfWeekMonday(new Date());
    const weeks: number[][] = [];
    for (let w = WEEKS_BACK - 1; w >= 0; w--) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - w * 7);
      const levels: number[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        levels.push(heatLevel(countsByDay.get(day.toDateString()) ?? 0));
      }
      weeks.push(levels);
    }
    return weeks;
  }, [completedSessions]);

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
          icon="📈"
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
        <StatCard icon="🔥" iconBg={AMB_D} value={streak} label="dias consecutivos" />
        <StatCard icon="📚" iconBg={BLUE_D} value={`${totalHours}h`} label="total do período" />
        <StatCard icon="🎯" iconBg={GRN_D} value={`${adherence}%`} label="aderência geral" />
        <StatCard icon="🧠" iconBg={LAV_D} value={reviewsDone} label="revisões feitas" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2 pb-1.5 border-b border-border">
            Mapa de atividade — {WEEKS_BACK} semanas
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1 text-[10px] text-muted text-center">
            {DAY_LABELS.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          {heatmapWeeks.map((week, w) => (
            <div key={w} className="flex gap-0.5 mb-[3px]">
              {week.map((lvl, d) => (
                <div
                  key={d}
                  className="flex-1 h-4 rounded"
                  style={{ background: HEATMAP_COLORS[lvl] }}
                />
              ))}
            </div>
          ))}
          <div className="flex gap-1.5 items-center mt-1.5">
            <span className="text-[10px] text-muted">Menos</span>
            {HEATMAP_COLORS.map((c, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            ))}
            <span className="text-[10px] text-muted">Mais</span>
          </div>
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
        <div className="flex flex-col gap-1.5">
          {insights.length === 0 ? (
            <div className="text-xs text-muted">
              Continue estudando para desbloquear insights personalizados do Progress Agent.
            </div>
          ) : (
            insights.map((text, i) => (
              <div key={i} className="bg-card2 border border-border rounded-md px-2.5 py-2 flex gap-2.5">
                <span className="text-sm shrink-0 mt-px">💡</span>
                <div className="text-xs text-txt leading-relaxed">{text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
