/**
 * Pedagogy Agent
 * Selects methodology per module. FSRS scheduling math lives in lib/utils/fsrs.ts
 * (scheduleCard) — this file used to carry a second, divergent interval formula
 * (calcNextReview) that was never called anywhere; removed to avoid the two drifting
 * further apart.
 */

// "Pomodoro" intentionally isn't in this union: per .claude/skills/study-methodology-mentor's own
// evidence file, timeboxing is a structural technique (organizes *when/how long* to work) that
// complements a content methodology rather than competing with it as a mutually-exclusive choice
// for a calendar slot — it's implemented as a session-level timer mode in SessionClient instead
// (lib/hooks/usePomodoro.ts), available for any session regardless of which of these gets picked.
export type Methodology =
  | "Repetição Espaçada"
  | "Active Recall"
  | "Prática Deliberada"
  | "Interleaving"
  | "Feynman"
  | "Mapas Mentais"
  | "Aprendizagem por Problemas";

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
  fsrsSignal?: FsrsSignal,
  // Module.topics.length — how many distinct subtopics this module's ementa lists. A rough proxy
  // for "does this module have a genuinely interconnected concept network to organize", the one
  // case concept/mind mapping has real support for (see selectMethodology's pend branch below).
  topicsCount = 0
): Methodology {
  if (daysToExam !== null && daysToExam < 14) return "Active Recall";
  if (moduleStatus === "done") {
    const struggling = !!fsrsSignal && fsrsSignal.reps > 0 && fsrsSignal.lapses / fsrsSignal.reps > STRUGGLING_LAPSE_RATIO;
    return struggling ? "Prática Deliberada" : "Repetição Espaçada";
  }
  if (moduleStatus === "prog") {
    // Every 4th session on a module already underway, swap in Aprendizagem por Problemas instead
    // of Active Recall/Feynman — applying knowledge to a realistic problem/case fits best once
    // there's some grounding to apply (prog), not on the very first pass (pend).
    const cycle = sessionIndexForDisc % 4;
    if (cycle === 2) return "Feynman";
    if (cycle === 3) return "Aprendizagem por Problemas";
    return "Active Recall";
  }
  // pend (genuinely new material): a module with several interrelated subtopics benefits from
  // organizing those relationships before drilling into recall/practice — Dunlosky et al. (2013)
  // rates concept mapping below retrieval/spacing for raw retention, so this is deliberately
  // gated (not the default) and only used for the structure-building case it's actually good at,
  // not treated as a general-purpose substitute for practice.
  if (topicsCount >= 4) return "Mapas Mentais";
  return "Prática Deliberada";
}
