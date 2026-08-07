/**
 * Progress Agent
 * Tracks adherence, streaks, and pending reviews; surfaces plain-language insights
 */
import type { Discipline, Module, StudySession } from "@/types";
import { calcETA } from "@/lib/utils/fsrs";

export function calcWeeklyAdherence(sessions: StudySession[], now: Date = new Date()): number {
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = sessions.filter((s) => new Date(s.scheduled_at) >= weekStart && new Date(s.scheduled_at) <= now);
  if (!thisWeek.length) return 0;

  const completed = thisWeek.filter((s) => s.completed).length;
  return Math.round((completed / thisWeek.length) * 100);
}

export function calcStreakDays(sessions: StudySession[], now: Date = new Date()): number {
  const completedDays = new Set(
    sessions.filter((s) => s.completed && s.completed_at).map((s) => new Date(s.completed_at!).toDateString())
  );

  let streak = 0;
  const cursor = new Date(now);
  while (completedDays.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function countPendingReviews(modules: Module[], now: Date = new Date()): number {
  return modules.filter((m) => m.fsrs_due_date && new Date(m.fsrs_due_date) <= now).length;
}

// Oldest → today, 7 entries. Powers the sidebar's streak bar (see Sidebar.tsx).
export function last7Days(sessions: StudySession[], now: Date = new Date()): boolean[] {
  const completedDays = new Set(
    sessions.filter((s) => s.completed && s.completed_at).map((s) => new Date(s.completed_at!).toDateString())
  );
  const days: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(completedDays.has(d.toDateString()));
  }
  return days;
}

export interface Insight {
  text: string;
  agent: "Progress Agent" | "Pedagogy Agent";
}

export type PaceStatus = "atrasado" | "no_prazo" | "adiantado" | "sem_prazo";

export interface DisciplinePace {
  disciplineId: string;
  status: PaceStatus;
  detail: string;
  expectedProgress: number | null; // % expected by now, given exam_date and when the discipline was added; null when there's no exam_date to project against
  actualProgress: number;
  /** Weeks until all pending module content is covered at the discipline's current
   * horas_semana pace (lib/utils/fsrs.ts::calcETA) — null once nothing is left pending. Computed
   * regardless of exam_date, since "quando eu termino isso" is a real question even without a
   * prova marked. */
  weeksToComplete: number | null;
  /** ISO date derived from weeksToComplete — the actual "data de término" for this content. */
  projectedCompletionDate: string | null;
}

function projectCompletion(d: Discipline, now: Date): { weeksToComplete: number | null; projectedCompletionDate: string | null } {
  const weeksToComplete = calcETA(d.modules ?? [], d.horas_semana);
  if (weeksToComplete === null) return { weeksToComplete: null, projectedCompletionDate: null };
  const date = new Date(now);
  date.setDate(date.getDate() + weeksToComplete * 7);
  return { weeksToComplete, projectedCompletionDate: date.toISOString() };
}

function formatDatePtBr(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// A student's own goal ("do I finish before the exam?") isn't answered by adherence/streak
// alone — this compares actual module completion against a straight-line expectation from
// when the discipline was added to its exam_date. Simple by design (linear pacing, not
// workload-weighted), but it's an honest, explainable number rather than nothing.
const BEHIND_THRESHOLD = -15; // percentage points below the linear-pace expectation
const AHEAD_THRESHOLD = 10;

export function calcDisciplinePace(d: Discipline, now: Date = new Date()): DisciplinePace {
  const actualProgress = d.progress;
  const { weeksToComplete, projectedCompletionDate } = projectCompletion(d, now);

  if (!d.exam_date) {
    const detail =
      weeksToComplete === null
        ? `${actualProgress}% concluído — todo o conteúdo já foi coberto.`
        : `${actualProgress}% concluído. Sem prova marcada — no ritmo atual, previsão de terminar o conteúdo em ${weeksToComplete} ${weeksToComplete === 1 ? "semana" : "semanas"} (${formatDatePtBr(projectedCompletionDate!)}).`;
    return {
      disciplineId: d.id,
      status: "sem_prazo",
      detail,
      expectedProgress: null,
      actualProgress,
      weeksToComplete,
      projectedCompletionDate,
    };
  }

  const start = new Date(d.created_at).getTime();
  const end = new Date(d.exam_date).getTime();
  const nowMs = now.getTime();

  if (!(end > start)) {
    return {
      disciplineId: d.id,
      status: "sem_prazo",
      detail: "Data de prova inválida.",
      expectedProgress: null,
      actualProgress,
      weeksToComplete,
      projectedCompletionDate,
    };
  }

  const daysLeft = Math.ceil((end - nowMs) / 86_400_000);

  if (nowMs >= end) {
    return actualProgress >= 100
      ? {
          disciplineId: d.id, status: "no_prazo", detail: "Prazo chegou com 100% concluído.",
          expectedProgress: 100, actualProgress, weeksToComplete, projectedCompletionDate,
        }
      : {
          disciplineId: d.id,
          status: "atrasado",
          detail: `Prazo da prova já passou com apenas ${actualProgress}% concluído.`,
          expectedProgress: 100,
          actualProgress,
          weeksToComplete,
          projectedCompletionDate,
        };
  }

  const elapsedFrac = Math.max(0, Math.min(1, (nowMs - start) / (end - start)));
  const expectedProgress = Math.round(elapsedFrac * 100);
  const diff = actualProgress - expectedProgress;

  if (diff <= BEHIND_THRESHOLD) {
    return {
      disciplineId: d.id,
      status: "atrasado",
      detail: `${expectedProgress}% esperado pelo tempo decorrido, mas só ${actualProgress}% concluído — ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} até a prova.`,
      expectedProgress,
      actualProgress,
      weeksToComplete,
      projectedCompletionDate,
    };
  }
  if (diff >= AHEAD_THRESHOLD) {
    return {
      disciplineId: d.id,
      status: "adiantado",
      detail: `${actualProgress}% concluído, acima do ritmo esperado (${expectedProgress}%) — ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} até a prova.`,
      expectedProgress,
      actualProgress,
      weeksToComplete,
      projectedCompletionDate,
    };
  }
  return {
    disciplineId: d.id,
    status: "no_prazo",
    detail: `${actualProgress}% concluído, dentro do ritmo esperado (${expectedProgress}%) — ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} até a prova.`,
    expectedProgress,
    actualProgress,
    weeksToComplete,
    projectedCompletionDate,
  };
}

export function generateInsights(sessions: StudySession[], modules: Module[], disciplines: Discipline[] = []): Insight[] {
  const insights: Insight[] = [];
  const adherence = calcWeeklyAdherence(sessions);
  const streak = calcStreakDays(sessions);
  const pending = countPendingReviews(modules);

  if (adherence < 50 && sessions.length > 0) {
    insights.push({ text: `Sua aderência esta semana está em ${adherence}% — abaixo da meta.`, agent: "Progress Agent" });
  }
  if (streak >= 3) {
    insights.push({ text: `Streak de ${streak} dias consecutivos — continue assim!`, agent: "Progress Agent" });
  }
  if (pending > 5) {
    insights.push({ text: `${pending} revisões atrasadas. Priorize-as na próxima sessão.`, agent: "Pedagogy Agent" });
  }
  for (const d of disciplines) {
    const pace = calcDisciplinePace(d);
    if (pace.status === "atrasado") {
      insights.push({ text: `"${d.name}" está atrasada: ${pace.detail}`, agent: "Progress Agent" });
    }
  }
  return insights;
}
