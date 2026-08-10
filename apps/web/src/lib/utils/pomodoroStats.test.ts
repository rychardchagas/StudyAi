import { describe, expect, it } from "vitest";
import { calcTodayPomodoroStats, calcWeekPomodoroStats, calcPomodoroStreak, type PomodoroRoundLike } from "./pomodoroStats";

function iso(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("calcTodayPomodoroStats", () => {
  it("counts only today's rounds, ignoring other days", () => {
    const rounds: PomodoroRoundLike[] = [
      { completed_at: iso(0, 9), focus_minutes: 25 },
      { completed_at: iso(0, 14), focus_minutes: 25 },
      { completed_at: iso(1, 9), focus_minutes: 25 }, // yesterday — excluded
    ];
    const stats = calcTodayPomodoroStats(rounds);
    expect(stats.rounds).toBe(2);
    expect(stats.focusMinutes).toBe(50);
  });

  it("buckets rounds by the hour they were completed", () => {
    const rounds: PomodoroRoundLike[] = [
      { completed_at: iso(0, 9), focus_minutes: 25 },
      { completed_at: iso(0, 9), focus_minutes: 25 },
      { completed_at: iso(0, 20), focus_minutes: 25 },
    ];
    const stats = calcTodayPomodoroStats(rounds);
    expect(stats.byHour[9]).toBe(2);
    expect(stats.byHour[20]).toBe(1);
    expect(stats.byHour.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("returns zeros for an empty log", () => {
    const stats = calcTodayPomodoroStats([]);
    expect(stats.rounds).toBe(0);
    expect(stats.focusMinutes).toBe(0);
    expect(stats.byHour).toEqual(Array(24).fill(0));
  });
});

describe("calcWeekPomodoroStats", () => {
  it("returns 7 entries, oldest to today, with real counts per day", () => {
    const rounds: PomodoroRoundLike[] = [
      { completed_at: iso(0), focus_minutes: 25 }, // today
      { completed_at: iso(0), focus_minutes: 25 }, // today, 2nd round
      { completed_at: iso(3), focus_minutes: 25 },
      { completed_at: iso(10), focus_minutes: 25 }, // outside the 7-day window
    ];
    const week = calcWeekPomodoroStats(rounds);
    expect(week).toHaveLength(7);
    expect(week[6].rounds).toBe(2); // today is the last entry
    expect(week[3].rounds).toBe(1); // 3 days ago
    expect(week.reduce((sum, d) => sum + d.rounds, 0)).toBe(3); // the 10-days-ago one is excluded
  });
});

describe("calcPomodoroStreak", () => {
  it("counts consecutive days with at least one round, ending today", () => {
    const rounds: PomodoroRoundLike[] = [iso(0), iso(1), iso(2)].map((completed_at) => ({
      completed_at,
      focus_minutes: 25,
    }));
    expect(calcPomodoroStreak(rounds)).toBe(3);
  });

  it("stops at the first gap", () => {
    const rounds: PomodoroRoundLike[] = [iso(0), iso(2)].map((completed_at) => ({ completed_at, focus_minutes: 25 }));
    expect(calcPomodoroStreak(rounds)).toBe(1); // yesterday (day 1) is missing
  });

  it("is 0 when there's no round today", () => {
    const rounds: PomodoroRoundLike[] = [{ completed_at: iso(1), focus_minutes: 25 }];
    expect(calcPomodoroStreak(rounds)).toBe(0);
  });
});
