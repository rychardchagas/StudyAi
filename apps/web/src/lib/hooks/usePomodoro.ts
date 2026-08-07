"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type PomodoroPhase = "work" | "break";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

// Timeboxing (work/break cycling) is a structural technique, not a content methodology — see the
// comment on Methodology in lib/agents/pedagogy.ts. This is a self-contained cycling timer a
// session can opt into regardless of which methodology got picked for it.
export function usePomodoro() {
  const [phase, setPhase] = useState<PomodoroPhase>("work");
  const [seconds, setSeconds] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  // Set for one render when a phase just ended, so the UI can toast/notify — the caller is
  // expected to consume it (call clearTransition) right after reacting to it.
  const [justTransitioned, setJustTransitioned] = useState<PomodoroPhase | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (seconds !== 0) return;
    setPhase((prevPhase) => {
      const nextPhase: PomodoroPhase = prevPhase === "work" ? "break" : "work";
      if (prevPhase === "work") setCyclesCompleted((c) => c + 1);
      setSeconds(nextPhase === "work" ? WORK_SECONDS : BREAK_SECONDS);
      setJustTransitioned(nextPhase);
      return nextPhase;
    });
  }, [seconds]);

  const toggle = useCallback(() => setRunning((p) => !p), []);
  const reset = useCallback(() => {
    setRunning(false);
    setPhase("work");
    setSeconds(WORK_SECONDS);
    setCyclesCompleted(0);
    setJustTransitioned(null);
  }, []);
  const clearTransition = useCallback(() => setJustTransitioned(null), []);

  const total = phase === "work" ? WORK_SECONDS : BREAK_SECONDS;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return {
    phase,
    seconds,
    running,
    cyclesCompleted,
    justTransitioned,
    toggle,
    reset,
    clearTransition,
    fmt,
    progress: 1 - seconds / total,
  };
}
