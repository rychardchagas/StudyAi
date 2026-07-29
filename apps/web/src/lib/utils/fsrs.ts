/**
 * Simplified FSRS (Free Spaced Repetition Scheduler) implementation
 * Based on FSRS v4 algorithm
 */

export type Rating = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy

export interface FSRSCard {
  stability: number;
  difficulty: number;
  dueDate: Date;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
}

const FSRS_W = [0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589, 1.5330];

export function initCard(): FSRSCard {
  return { stability: 0, difficulty: 0, dueDate: new Date(), reps: 0, lapses: 0, state: "new" };
}

export function scheduleCard(card: FSRSCard, rating: Rating): FSRSCard {
  const now = new Date();

  if (card.state === "new") {
    const initStability = FSRS_W[rating - 1];
    const initDifficulty = FSRS_W[4] - (rating - 3) * FSRS_W[5];
    const intervalDays = Math.max(1, Math.round(initStability));
    const due = new Date(now);
    due.setDate(due.getDate() + intervalDays);
    return { stability: initStability, difficulty: Math.max(1, Math.min(10, initDifficulty)), dueDate: due, reps: 1, lapses: 0, state: "learning" };
  }

  const retrievability = Math.exp(Math.log(0.9) * (Date.now() - card.dueDate.getTime()) / (card.stability * 86400000));
  const newDifficulty = card.difficulty - FSRS_W[6] * (rating - 3);
  const clampedDiff = Math.max(1, Math.min(10, newDifficulty));

  let newStability: number;
  if (rating >= 3) {
    newStability = card.stability * (Math.exp(FSRS_W[8]) * (11 - clampedDiff) * Math.pow(card.stability, -FSRS_W[5]) * (Math.exp((1 - retrievability) * FSRS_W[6]) - 1) + 1);
  } else {
    newStability = FSRS_W[7] * Math.pow(clampedDiff, -FSRS_W[5]) * (Math.pow(card.stability + 1, FSRS_W[8]) - 1);
  }

  const intervalDays = Math.max(1, Math.round(newStability));
  const due = new Date(now);
  due.setDate(due.getDate() + intervalDays);

  return {
    stability: newStability,
    difficulty: clampedDiff,
    dueDate: due,
    reps: card.reps + 1,
    lapses: rating < 3 ? card.lapses + 1 : card.lapses,
    state: rating >= 3 ? "review" : "relearning",
  };
}

export function calcETA(modules: Array<{ status: string; estimated_hours: number }>, horasPerWeek: number): number | null {
  const pending = modules.filter((m) => m.status !== "done");
  if (!pending.length) return null;
  const total = pending.reduce((a, m) => a + (m.estimated_hours ?? 4), 0);
  return Math.ceil(total / Math.max(1, horasPerWeek));
}
