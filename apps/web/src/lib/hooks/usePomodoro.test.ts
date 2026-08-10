import { describe, expect, it } from "vitest";
import { nextPhaseAfter, phaseSeconds, DEFAULT_POMODORO_CONFIG, type PomodoroConfig, type TimerState } from "./usePomodoro";

const cfg: PomodoroConfig = DEFAULT_POMODORO_CONFIG; // 25/5/15, long break every 4th round

function work(cyclesCompleted: number): TimerState {
  return { phase: "work", seconds: 0, cyclesCompleted };
}
function shortBreak(cyclesCompleted: number): TimerState {
  return { phase: "short-break", seconds: 0, cyclesCompleted };
}
function longBreak(cyclesCompleted: number): TimerState {
  return { phase: "long-break", seconds: 0, cyclesCompleted };
}

describe("phaseSeconds", () => {
  it("returns the configured duration for each phase, in seconds", () => {
    expect(phaseSeconds("work", cfg)).toBe(25 * 60);
    expect(phaseSeconds("short-break", cfg)).toBe(5 * 60);
    expect(phaseSeconds("long-break", cfg)).toBe(15 * 60);
  });
});

describe("nextPhaseAfter", () => {
  it("goes to a short break after work rounds that aren't a multiple of the long-break interval", () => {
    for (const cyclesBefore of [0, 1, 2]) {
      const next = nextPhaseAfter(work(cyclesBefore), cfg);
      expect(next.phase).toBe("short-break");
      expect(next.cyclesCompleted).toBe(cyclesBefore + 1);
      expect(next.seconds).toBe(cfg.shortBreakMinutes * 60);
    }
  });

  it("goes to a long break exactly every longBreakInterval-th work round", () => {
    const next = nextPhaseAfter(work(3), cfg); // 3 -> 4th completed round
    expect(next.phase).toBe("long-break");
    expect(next.cyclesCompleted).toBe(4);
    expect(next.seconds).toBe(cfg.longBreakMinutes * 60);
  });

  it("always returns to work after a short break, without touching the cycle count", () => {
    const next = nextPhaseAfter(shortBreak(1), cfg);
    expect(next.phase).toBe("work");
    expect(next.cyclesCompleted).toBe(1); // unchanged — only work completions increment it
    expect(next.seconds).toBe(cfg.workMinutes * 60);
  });

  it("always returns to work after a long break too", () => {
    const next = nextPhaseAfter(longBreak(4), cfg);
    expect(next.phase).toBe("work");
    expect(next.cyclesCompleted).toBe(4);
  });

  it("respects a custom longBreakInterval", () => {
    const custom: PomodoroConfig = { ...cfg, longBreakInterval: 2 };
    expect(nextPhaseAfter(work(0), custom).phase).toBe("short-break"); // round 1
    expect(nextPhaseAfter(work(1), custom).phase).toBe("long-break"); // round 2
  });
});
