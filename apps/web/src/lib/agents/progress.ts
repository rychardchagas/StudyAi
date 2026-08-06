/**
 * Progress Agent
 * Tracks adherence, streaks, and pending reviews; surfaces plain-language insights
 */
import type { Module, StudySession } from "@/types";

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

export function generateInsights(sessions: StudySession[], modules: Module[]): Insight[] {
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
  return insights;
}
