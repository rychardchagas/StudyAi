import { describe, expect, it } from "vitest";
import { generateCalendar } from "./scheduler";
import type { Discipline } from "@/types";

function makeDiscipline(overrides: Partial<Discipline> & { id: string; name: string }): Discipline {
  return {
    type: "Graduação",
    color: "#3B82F6",
    horas_semana: 4,
    prioridade: "Média",
    exam_date: null,
    progress: 0,
    fixed_schedule: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    modules: [],
    ...overrides,
  };
}

describe("generateCalendar distribution", () => {
  // A gets high weight (more sessions), B gets low weight but still several — enough that B's
  // budget runs out partway through the week if (and only if) sessions are spread evenly across
  // days from the start, rather than the queue accidentally aligning with day boundaries.
  const disciplineA = makeDiscipline({ id: "a", name: "Alta Prioridade", horas_semana: 6, prioridade: "Alta" });
  const disciplineB = makeDiscipline({ id: "b", name: "Baixa Prioridade", horas_semana: 4, prioridade: "Baixa" });
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
    const evenA = makeDiscipline({ id: "a", name: "A", horas_semana: 4, prioridade: "Média" });
    const evenB = makeDiscipline({ id: "b", name: "B", horas_semana: 4, prioridade: "Média" });
    const oneDay = { 0: [1, 2, 3, 4, 5, 6] };
    const events = generateCalendar([evenA, evenB], oneDay).sort((a, b) => a.slotIndex - b.slotIndex);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].disciplineId).not.toBe(events[i - 1].disciplineId);
    }
  });
});
