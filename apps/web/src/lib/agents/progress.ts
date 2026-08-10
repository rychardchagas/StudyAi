/**
 * Progress Agent
 * Tracks adherence, streaks, and pending reviews; surfaces plain-language insights
 */
import type { Discipline, Module, StudySession } from "@/types";
import { calcETA } from "@/lib/utils/fsrs";
import { nearestEvaluationDate } from "@/lib/utils/evaluations";

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
  const examDate = nearestEvaluationDate(d, now);

  if (!examDate) {
    // calcETA (and so weeksToComplete) returns null both when every module is done AND when
    // there are zero modules at all — same signal, opposite meanings. Disambiguate here instead
    // of overloading calcETA's contract for every other caller: a discipline with no modules
    // hasn't "covered" anything, there was just never any content registered to cover.
    const hasModules = (d.modules ?? []).length > 0;
    const detail = !hasModules
      ? "Nenhum módulo cadastrado ainda — adicione o conteúdo em Matérias para o calendário gerar sessões de estudo."
      : weeksToComplete === null
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
  const end = new Date(examDate).getTime();
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

export interface Gamification {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressToNextLevel: number; // 0-1
}

// A motivational layer on top of real study activity — not a pedagogy claim like FSRS/
// methodology selection elsewhere in this file, just XP/levels over what the student actually
// did:
// - 15 XP per completed session (showing up and studying is the core unit)
// - +5 XP bonus per completed spaced-repetition review (rewards the harder-to-sustain habit,
//   not just raw session count)
// - +3 XP per day of the *current* streak (rewards consistency; a broken streak stops earning
//   new bonus XP, but XP already earned from past sessions is never taken away)
// Level curve is a square-root shape (xpForLevel(L) = 50 * (L-1)^2): quick early levels, each
// subsequent one needs progressively more — level 1 at 0 XP, 2 at 50, 3 at 200, 4 at 450, 5 at 800.
const XP_PER_SESSION = 15;
const XP_PER_REVIEW = 5;
const XP_PER_STREAK_DAY = 3;
const LEVEL_XP_UNIT = 50;

function xpForLevel(level: number): number {
  return LEVEL_XP_UNIT * (level - 1) ** 2;
}

export function calcGamification(sessions: StudySession[], now: Date = new Date()): Gamification {
  const completed = sessions.filter((s) => s.completed);
  const reviews = completed.filter((s) => s.methodology?.includes("Espaçada")).length;
  const streak = calcStreakDays(sessions, now);
  const xp = completed.length * XP_PER_SESSION + reviews * XP_PER_REVIEW + streak * XP_PER_STREAK_DAY;

  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;

  const currentFloor = xpForLevel(level);
  const nextFloor = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentFloor;
  const xpForNextLevel = nextFloor - currentFloor;

  return {
    xp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    progressToNextLevel: xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 1,
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
