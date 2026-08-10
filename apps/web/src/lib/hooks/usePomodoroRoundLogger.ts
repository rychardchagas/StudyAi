"use client";
import { useEffect } from "react";
import type { PomodoroPhase } from "./usePomodoro";

// Shared by SessionClient and PomodoroClient — logs one row to pomodoro_rounds whenever a work
// round finishes naturally (justTransitioned fires exactly once per real phase change, from the
// zero-crossing effect in usePomodoro — never from a manual skip/reset, so this only ever counts
// rounds actually completed in full). Best-effort: a failed log shouldn't interrupt the timer.
export function usePomodoroRoundLogger(justTransitioned: PomodoroPhase | null, workMinutes: number) {
  useEffect(() => {
    if (!justTransitioned || justTransitioned === "work") return; // only work -> break counts as a completed round
    fetch("/api/pomodoro/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed_at: new Date().toISOString(), focus_minutes: workMinutes }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justTransitioned]);
}
