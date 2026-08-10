import { describe, expect, it } from "vitest";
import { calcGamification, calcDisciplinePace } from "./progress";
import type { Discipline, StudySession } from "@/types";

function makeSession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: crypto.randomUUID(),
    discipline_id: "d1",
    module_id: null,
    scheduled_at: new Date().toISOString(),
    duration_minutes: 45,
    methodology: "Prática Deliberada",
    completed: true,
    recall_score: null,
    notes: null,
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeDiscipline(overrides: Partial<Discipline> & { id: string; name: string }): Discipline {
  return {
    type: "Graduação",
    color: "#3B82F6",
    horas_semana: 4,
    prioridade: "Média",
    exam_date: null,
    progress: 0,
    fixed_schedule: [],
    group_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    modules: [],
    ...overrides,
  };
}

describe("calcGamification", () => {
  it("starts at level 1 with 0 XP when there are no completed sessions", () => {
    const g = calcGamification([]);
    expect(g).toEqual({ xp: 0, level: 1, xpIntoLevel: 0, xpForNextLevel: 50, progressToNextLevel: 0 });
  });

  it("only counts completed sessions toward XP", () => {
    const g = calcGamification([makeSession({ completed: false })]);
    expect(g.xp).toBe(0);
  });

  it("awards base XP per session plus a bonus for spaced-repetition reviews", () => {
    const sessions = [
      makeSession({ methodology: "Prática Deliberada" }), // 15 XP
      makeSession({ methodology: "Repetição Espaçada" }), // 15 + 5 = 20 XP
    ];
    // No streak bonus here since completed_at defaults to "now" for both — same day counts as
    // a 1-day streak, so 3 XP from streak too.
    const g = calcGamification(sessions);
    expect(g.xp).toBe(15 + 20 + 3);
  });

  it("levels up once XP crosses the level's threshold (50 * (level-1)^2)", () => {
    // 4 completed plain sessions = 60 XP + streak bonus (same-day => streak 1 => +3) = 63 XP,
    // past the 50 XP needed for level 2.
    const sessions = Array.from({ length: 4 }, () => makeSession());
    const g = calcGamification(sessions);
    expect(g.xp).toBe(63);
    expect(g.level).toBe(2);
    expect(g.xpIntoLevel).toBe(13); // 63 - 50
    expect(g.xpForNextLevel).toBe(150); // level 3 floor (200) - level 2 floor (50)
  });

  it("computes progressToNextLevel as a 0-1 fraction into the current level", () => {
    const sessions = Array.from({ length: 4 }, () => makeSession());
    const g = calcGamification(sessions);
    expect(g.progressToNextLevel).toBeCloseTo(13 / 150, 5);
  });
});

describe("calcDisciplinePace", () => {
  it("says 'no modules registered' instead of 'all content covered' for a discipline with zero modules", () => {
    // Real bug: calcETA([], ...) returns null for the exact same reason it returns null when
    // every module is "done" — calcDisciplinePace used to conflate the two and tell a student
    // who never added any content that "todo o conteúdo já foi coberto" (all content already
    // covered), which is backwards.
    const empty = makeDiscipline({ id: "d", name: "Inglês", modules: [] });
    const pace = calcDisciplinePace(empty);
    expect(pace.detail).not.toMatch(/já foi coberto/);
    expect(pace.detail).toMatch(/nenhum módulo cadastrado/i);
  });

  it("still says 'all content covered' when modules exist and are all done", () => {
    const allDone = makeDiscipline({
      id: "d",
      name: "Com conteúdo",
      progress: 100,
      modules: [
        { id: "m0", discipline_id: "d", name: "M0", status: "done", estimated_hours: 4, order_index: 0,
          fsrs_stability: 0, fsrs_difficulty: 0, fsrs_due_date: null, fsrs_reps: 0, fsrs_lapses: 0,
          fsrs_state: "new", topics: [], created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
      ],
    });
    const pace = calcDisciplinePace(allDone);
    expect(pace.detail).toMatch(/já foi coberto/);
  });
});
