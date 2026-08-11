import { describe, expect, it } from "vitest";
import { filterPastDayEvents } from "./filterPastDayEvents";
import type { CalendarEvent } from "@/types";

function event(dayOfWeek: number): CalendarEvent {
  return {
    disciplineId: "d1",
    disciplineName: "Teste",
    disciplineColor: "#fff",
    moduleId: "m1",
    moduleName: "Mod",
    dayOfWeek,
    slotIndex: 5,
    methodology: "Active Recall",
    durationMinutes: 45,
  };
}

describe("filterPastDayEvents", () => {
  it("drops events on a day before today (the real bug: model ignored the prompt instruction)", () => {
    const events = [event(0), event(1), event(2), event(3)];
    const result = filterPastDayEvents(events, 3);
    expect(result.map((e) => e.dayOfWeek)).toEqual([3]);
  });

  it("keeps every event when today is Monday (day 0) — nothing in the current week can be past yet", () => {
    const events = [event(0), event(1), event(6)];
    expect(filterPastDayEvents(events, 0)).toHaveLength(3);
  });

  it("keeps today's own events, only drops strictly earlier days", () => {
    const events = [event(2), event(3)];
    expect(filterPastDayEvents(events, 3).map((e) => e.dayOfWeek)).toEqual([3]);
  });

  it("returns an empty array when every event is in the past", () => {
    const events = [event(0), event(1)];
    expect(filterPastDayEvents(events, 5)).toEqual([]);
  });
});
