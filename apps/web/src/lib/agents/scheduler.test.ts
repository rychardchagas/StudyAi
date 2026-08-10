import { describe, expect, it } from "vitest";
import { generateCalendar } from "./scheduler";
import type { Discipline, Module } from "@/types";

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

function makeModule(overrides: Partial<Module> & { id: string; name: string; status: Module["status"] }): Module {
  return {
    discipline_id: "unused",
    estimated_hours: 4,
    order_index: 0,
    fsrs_stability: 0,
    fsrs_difficulty: 0,
    fsrs_due_date: null,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_state: "new",
    topics: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("generateCalendar distribution", () => {
  // A gets high weight (more sessions), B gets low weight but still several — enough that B's
  // budget runs out partway through the week if (and only if) sessions are spread evenly across
  // days from the start, rather than the queue accidentally aligning with day boundaries.
  // A discipline with zero modules gets zero weight (see the dedicated tests below) — these two
  // exist to test distribution/interleaving math, so they need at least one module each to stay
  // meaningful under that rule, even though the module's own content is irrelevant here.
  const disciplineA = makeDiscipline({
    id: "a", name: "Alta Prioridade", horas_semana: 6, prioridade: "Alta",
    modules: [makeModule({ id: "a-m0", name: "A Module", status: "pend" })],
  });
  const disciplineB = makeDiscipline({
    id: "b", name: "Baixa Prioridade", horas_semana: 4, prioridade: "Baixa",
    modules: [makeModule({ id: "b-m0", name: "B Module", status: "pend" })],
  });
  const fiveDaysFourSlots = { 0: [1, 2, 3, 4], 1: [1, 2, 3, 4], 2: [1, 2, 3, 4], 3: [1, 2, 3, 4], 4: [1, 2, 3, 4] };

  it("does not silently drop sessions when interleaving can't find a swap partner", () => {
    const events = generateCalendar([disciplineA, disciplineB], fiveDaysFourSlots);
    // Hand-verified expected allocation for this weight/availability combo: 13 sessions for A,
    // 5 for B — every one of those 18 must land on a real slot, not vanish into a skipped gap.
    expect(events.length).toBe(18);
  });

  it("spreads a lower-weight discipline across the week instead of clustering it on the first days", () => {
    const events = generateCalendar([disciplineA, disciplineB], fiveDaysFourSlots);
    const bDays = new Set(events.filter((e) => e.disciplineId === "b").map((e) => e.dayOfWeek));
    // Regression guard: sorting availability day-by-day before walking the round-robin queue
    // used to leave the lower-weight discipline confined to whichever 2-3 days came first
    // (Monday/Tuesday), even with 5 days available. It should now reach most/all of the week.
    expect(bDays.size).toBeGreaterThanOrEqual(4);
  });

  it("actually avoids a same-discipline repeat when the queue swap finds a partner", () => {
    // Two evenly-weighted disciplines with a single shared day should strictly alternate —
    // this fails if the swap mutates the queue but the placement code still reads the
    // pre-swap reference (the bug this test guards against).
    const evenA = makeDiscipline({
      id: "a", name: "A", horas_semana: 4, prioridade: "Média",
      modules: [makeModule({ id: "a-m0", name: "A Module", status: "pend" })],
    });
    const evenB = makeDiscipline({
      id: "b", name: "B", horas_semana: 4, prioridade: "Média",
      modules: [makeModule({ id: "b-m0", name: "B Module", status: "pend" })],
    });
    const oneDay = { 0: [1, 2, 3, 4, 5, 6] };
    const events = generateCalendar([evenA, evenB], oneDay).sort((a, b) => a.slotIndex - b.slotIndex);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].disciplineId).not.toBe(events[i - 1].disciplineId);
    }
  });

  it("prioritizes a module whose real FSRS due date has passed over ones not due yet", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 30 * 86400000).toISOString();
    // Due module deliberately isn't done[0] — the old rotation-only logic would only reach it
    // by luck of the `sc % done.length` cycle, not because it's actually due.
    const notDue1 = makeModule({ id: "not-due-1", name: "Not due 1", status: "done", fsrs_due_date: future });
    const notDue2 = makeModule({ id: "not-due-2", name: "Not due 2", status: "done", fsrs_due_date: future });
    const due = makeModule({ id: "due", name: "Actually due", status: "done", fsrs_due_date: past });
    const notDue3 = makeModule({ id: "not-due-3", name: "Not due 3", status: "done", fsrs_due_date: future });
    const disc = makeDiscipline({
      id: "d", name: "Single Discipline", horas_semana: 10, prioridade: "Alta",
      modules: [notDue1, notDue2, due, notDue3],
    });
    const availability = { 0: [1, 2, 3, 4, 5, 6], 1: [1, 2, 3, 4, 5, 6] };

    const events = generateCalendar([disc], availability);
    const reviewEvents = events.filter((e) => e.moduleName.startsWith("🔁 Revisão"));
    expect(reviewEvents.length).toBeGreaterThan(1); // need more than one sample for this to mean anything
    expect(reviewEvents.every((e) => e.moduleId === "due")).toBe(true);
  });

  it("uses Prática Deliberada instead of Repetição Espaçada for a module with a high FSRS lapse rate", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    // 3 lapses out of 5 reps — above the 0.4 struggling threshold in selectMethodology().
    const struggling = makeModule({
      id: "struggling", name: "Struggling module", status: "done",
      fsrs_due_date: past, fsrs_reps: 5, fsrs_lapses: 3,
    });
    const disc = makeDiscipline({
      id: "d", name: "Single Discipline", horas_semana: 10, prioridade: "Alta", modules: [struggling],
    });
    const availability = { 0: [1, 2, 3, 4, 5, 6], 1: [1, 2, 3, 4, 5, 6] };

    const events = generateCalendar([disc], availability);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.methodology === "Prática Deliberada")).toBe(true);
    expect(events.some((e) => e.methodology === "Repetição Espaçada")).toBe(false);
  });

  it("excludes days before today on the current week (weekIndex 0) but not other weeks", () => {
    const disc = makeDiscipline({
      id: "a", name: "A", horas_semana: 6, prioridade: "Alta",
      modules: [makeModule({ id: "m0", name: "Module", status: "pend" })],
    });
    const availability = { 0: [1, 2], 1: [1, 2], 2: [1, 2], 3: [1, 2], 4: [1, 2] };

    // "Today" is Thursday (index 3) — Mon/Tue/Wed already happened this week.
    const thisWeek = generateCalendar([disc], availability, { weekIndex: 0, todayDayOfWeek: 3 });
    expect(thisWeek.some((e) => e.dayOfWeek < 3)).toBe(false);
    expect(thisWeek.some((e) => e.dayOfWeek >= 3)).toBe(true);

    // Next week is entirely in the future — todayDayOfWeek shouldn't restrict it even if passed.
    const nextWeek = generateCalendar([disc], availability, { weekIndex: 1, todayDayOfWeek: 3 });
    expect(nextWeek.some((e) => e.dayOfWeek < 3)).toBe(true);
  });

  it("advances the module rotation on future weeks instead of repeating week 0 verbatim", () => {
    const modules = Array.from({ length: 6 }, (_, i) =>
      makeModule({ id: `m${i}`, name: `Module ${i}`, status: "pend" })
    );
    const disc = makeDiscipline({ id: "a", name: "A", horas_semana: 10, prioridade: "Alta", modules });
    const availability = { 0: [1, 2, 3], 1: [1, 2, 3] };

    const week0 = generateCalendar([disc], availability, { weekIndex: 0 });
    const week1 = generateCalendar([disc], availability, { weekIndex: 1 });
    const week0Modules = week0.map((e) => e.moduleId).join(",");
    const week1Modules = week1.map((e) => e.moduleId).join(",");
    expect(week1Modules).not.toBe(week0Modules);
  });

  it("gives zero proportional slots to a discipline with no modules registered yet", () => {
    // Real bug: "Inglês" (0 modules, horas_semana 2) was still getting weighted slots — every
    // one of them fell back to pickModuleForSession() returning undefined, so the event showed
    // moduleName === disciplineName (e.g. "Inglês / Inglês", nothing real to study). A
    // content-less discipline should get 0 proportional sessions, leaving that room for the
    // discipline that actually has modules.
    const empty = makeDiscipline({ id: "empty", name: "Inglês", horas_semana: 2, modules: [] });
    const withContent = makeDiscipline({
      id: "content", name: "Com Conteúdo", horas_semana: 6, prioridade: "Alta",
      modules: [makeModule({ id: "m0", name: "Module 0", status: "pend" })],
    });
    const availability = { 0: [1, 2, 3, 4], 1: [1, 2, 3, 4], 2: [1, 2, 3, 4] };

    const events = generateCalendar([empty, withContent], availability);
    expect(events.some((e) => e.disciplineId === "empty")).toBe(false);
    expect(events.every((e) => e.disciplineId === "content")).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  it("does not divide by zero when every discipline has no modules", () => {
    const empty = makeDiscipline({ id: "empty", name: "Inglês", horas_semana: 2, modules: [] });
    const availability = { 0: [1, 2, 3, 4] };
    expect(() => generateCalendar([empty], availability)).not.toThrow();
    expect(generateCalendar([empty], availability)).toEqual([]);
  });

  it("stops scheduling 'new' content once the projected pace has covered it all, switching to review", () => {
    // 2 pend modules, high weekly quota (10h/wk, 1 discipline, generous availability) — the
    // projection should cover both well within a couple of weeks.
    const modules = [
      makeModule({ id: "m0", name: "Module 0", status: "pend" }),
      makeModule({ id: "m1", name: "Module 1", status: "pend" }),
    ];
    const disc = makeDiscipline({ id: "a", name: "A", horas_semana: 10, prioridade: "Alta", modules });
    const availability = { 0: [1, 2, 3, 4, 5, 6], 1: [1, 2, 3, 4, 5, 6] };

    const farFuture = generateCalendar([disc], availability, { weekIndex: 10 });
    expect(farFuture.length).toBeGreaterThan(0);
    // Every session should now be framed as review, not fresh "new content".
    expect(farFuture.every((e) => e.moduleName.startsWith("🔁 Revisão"))).toBe(true);
    expect(farFuture.every((e) => e.methodology !== "Prática Deliberada")).toBe(true);
  });
});
