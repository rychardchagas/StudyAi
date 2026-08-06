/**
 * Pedagogy Agent
 * Selects methodology per module. FSRS scheduling math lives in lib/utils/fsrs.ts
 * (scheduleCard) — this file used to carry a second, divergent interval formula
 * (calcNextReview) that was never called anywhere; removed to avoid the two drifting
 * further apart. Wire scheduleCard() in when the sessions/complete FSRS TODO is picked up.
 */

export type Methodology =
  | "Repetição Espaçada"
  | "Active Recall"
  | "Prática Deliberada"
  | "Interleaving"
  | "Feynman"
  | "Pomodoro";

export function selectMethodology(
  moduleStatus: "pend" | "prog" | "done",
  daysToExam: number | null,
  sessionIndexForDisc: number
): Methodology {
  if (daysToExam !== null && daysToExam < 14) return "Active Recall";
  if (moduleStatus === "done") return "Repetição Espaçada";
  if (moduleStatus === "prog") return sessionIndexForDisc % 3 === 2 ? "Feynman" : "Active Recall";
  return "Prática Deliberada";
}
