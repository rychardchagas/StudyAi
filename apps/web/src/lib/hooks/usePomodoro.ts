"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type PomodoroPhase = "work" | "short-break" | "long-break";

// Configuration model scoped down from pomofocus.io / github.com/Splode/pomotroid to just the
// part that applies to a web study timer — durations, long-break cadence, auto-start. Left out
// on purpose: their desktop-app extras (OS tray icon, global keyboard shortcuts, a websocket
// server, per-app themes, a dedicated stats/heatmap engine) — StudyAI already has its own
// streak/progress tracking, and building a second one just for Pomodoro would duplicate it.
export interface PomodoroConfig {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** How many work rounds happen before a long break instead of a short one. */
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
};

export function phaseSeconds(phase: PomodoroPhase, cfg: PomodoroConfig): number {
  if (phase === "work") return cfg.workMinutes * 60;
  if (phase === "short-break") return cfg.shortBreakMinutes * 60;
  return cfg.longBreakMinutes * 60;
}

export interface TimerState {
  phase: PomodoroPhase;
  seconds: number;
  cyclesCompleted: number;
}

// Pure transition logic, exported and unit-tested on its own — the hook around it (interval,
// running/toggle state) needs a DOM/React test harness this project doesn't have set up yet, but
// the actual state machine (when does a long break happen, does the cycle counter advance) has
// no such dependency and is exactly the part worth getting right and pinned down by a test.
export function nextPhaseAfter(s: TimerState, cfg: PomodoroConfig): TimerState {
  let nextPhase: PomodoroPhase;
  let nextCycles = s.cyclesCompleted;
  if (s.phase === "work") {
    nextCycles = s.cyclesCompleted + 1;
    nextPhase = nextCycles % cfg.longBreakInterval === 0 ? "long-break" : "short-break";
  } else {
    nextPhase = "work";
  }
  return { phase: nextPhase, seconds: phaseSeconds(nextPhase, cfg), cyclesCompleted: nextCycles };
}

// Timeboxing (work/break cycling) is a structural technique, not a content methodology — see the
// comment on Methodology in lib/agents/pedagogy.ts. This is a self-contained cycling timer,
// usable inside a study session or standalone (see app/(app)/pomodoro), independent of whatever
// content methodology (if any) a session is using.
export function usePomodoro(config: PomodoroConfig = DEFAULT_POMODORO_CONFIG) {
  // Phase/seconds/cyclesCompleted are one state object, not three separate useState calls — the
  // zero-crossing transition needs to update all three consistently in a single functional
  // updater; splitting them invites stale-closure bugs where one derived from another one render
  // behind.
  const [state, setState] = useState<TimerState>(() => ({
    phase: "work",
    seconds: phaseSeconds("work", config),
    cyclesCompleted: 0,
  }));
  const [running, setRunning] = useState(false);
  // Set for one render when a phase just ended, so the UI can toast/notify — the caller is
  // expected to consume it (call clearTransition) right after reacting to it.
  const [justTransitioned, setJustTransitioned] = useState<PomodoroPhase | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setState((s) => (s.seconds > 0 ? { ...s, seconds: s.seconds - 1 } : s));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (state.seconds !== 0) return;
    const cfg = configRef.current;
    setState((s) => {
      const next = nextPhaseAfter(s, cfg);
      setJustTransitioned(next.phase);
      setRunning(next.phase === "work" ? cfg.autoStartWork : cfg.autoStartBreaks);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.seconds]);

  // Settings edited while paused should be reflected right away (matches pomofocus.io) — but
  // never while running, which would yank real countdown progress out from under the student
  // mid-round; a mid-round config change applies starting from the next natural transition.
  const configKey = `${config.workMinutes}-${config.shortBreakMinutes}-${config.longBreakMinutes}`;
  const prevConfigKeyRef = useRef(configKey);
  useEffect(() => {
    if (configKey === prevConfigKeyRef.current) return;
    prevConfigKeyRef.current = configKey;
    if (running) return;
    setState((s) => ({ ...s, seconds: phaseSeconds(s.phase, config) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, running]);

  const toggle = useCallback(() => setRunning((p) => !p), []);
  const reset = useCallback(() => {
    setRunning(false);
    setJustTransitioned(null);
    setState({ phase: "work", seconds: phaseSeconds("work", configRef.current), cyclesCompleted: 0 });
  }, []);
  // Manually advance to the next phase (the "⏭" control) — same transition the natural
  // seconds-hit-zero path takes, just triggered on demand.
  const skip = useCallback(() => {
    setState((s) => nextPhaseAfter(s, configRef.current));
  }, []);
  const clearTransition = useCallback(() => setJustTransitioned(null), []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const total = phaseSeconds(state.phase, config);

  return {
    phase: state.phase,
    seconds: state.seconds,
    running,
    cyclesCompleted: state.cyclesCompleted,
    justTransitioned,
    toggle,
    reset,
    skip,
    clearTransition,
    fmt,
    progress: 1 - state.seconds / total,
  };
}
