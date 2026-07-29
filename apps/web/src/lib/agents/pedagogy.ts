/**
 * Pedagogy Agent
 * Applies FSRS algorithm, selects methodology per module
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

// Simplified FSRS interval calculation
export function calcNextReview(stability: number, difficulty: number, rating: 1 | 2 | 3 | 4): number {
  const w = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];
  const newStability = stability * Math.exp(w[17 - rating] * (11 - difficulty) * Math.pow(stability, -w[5]));
  return Math.round(9 * (newStability / stability) * ((2.5 * rating) - 5.5));
}
