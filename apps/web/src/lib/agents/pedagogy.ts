/**
 * Pedagogy Agent
 * Selects methodology per module. FSRS scheduling math lives in lib/utils/fsrs.ts
 * (scheduleCard) — this file used to carry a second, divergent interval formula
 * (calcNextReview) that was never called anywhere; removed to avoid the two drifting
 * further apart.
 */

export type Methodology =
  | "Repetição Espaçada"
  | "Active Recall"
  | "Prática Deliberada"
  | "Interleaving"
  | "Feynman"
  | "Pomodoro";

// Real per-module signal from lib/utils/fsrs.ts::scheduleCard(), now wired in
// app/api/sessions/complete/route.ts — a high lapse rate means passive spaced review isn't
// sticking for this module, so it needs deeper practice, not another quick look.
export interface FsrsSignal {
  lapses: number;
  reps: number;
}

const STRUGGLING_LAPSE_RATIO = 0.4;

export function selectMethodology(
  moduleStatus: "pend" | "prog" | "done",
  daysToExam: number | null,
  sessionIndexForDisc: number,
  fsrsSignal?: FsrsSignal
): Methodology {
  if (daysToExam !== null && daysToExam < 14) return "Active Recall";
  if (moduleStatus === "done") {
    const struggling = !!fsrsSignal && fsrsSignal.reps > 0 && fsrsSignal.lapses / fsrsSignal.reps > STRUGGLING_LAPSE_RATIO;
    return struggling ? "Prática Deliberada" : "Repetição Espaçada";
  }
  if (moduleStatus === "prog") return sessionIndexForDisc % 3 === 2 ? "Feynman" : "Active Recall";
  return "Prática Deliberada";
}
