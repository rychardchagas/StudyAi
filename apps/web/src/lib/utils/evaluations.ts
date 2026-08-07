import type { Discipline, Evaluation } from "@/types";

// evaluations supersedes the older single disciplines.exam_date field — this is the one place
// every consumer (scheduler, pace tracking, urgency styling) should go through, so a discipline
// created before this feature (no rows in `evaluations` yet) still works via exam_date, and one
// with multiple entries always gets judged by whichever is soonest.
export function nearestEvaluationDate(
  d: { evaluations?: Evaluation[]; exam_date?: string | null },
  now: Date = new Date()
): string | null {
  const todayMs = now.getTime();
  const upcoming = (d.evaluations ?? [])
    .filter((e) => new Date(e.date).getTime() >= todayMs)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (upcoming.length) return upcoming[0].date;
  return d.exam_date ?? null;
}

export function daysUntil(dateStr: string | null, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - now.getTime()) / 86_400_000));
}

export function nearestEvaluationDaysUntil(d: Pick<Discipline, "evaluations" | "exam_date">, now: Date = new Date()): number | null {
  return daysUntil(nearestEvaluationDate(d, now), now);
}
