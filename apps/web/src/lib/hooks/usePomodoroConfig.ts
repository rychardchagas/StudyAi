"use client";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_POMODORO_CONFIG, type PomodoroConfig } from "./usePomodoro";

function readConfig(saved: unknown, fallback: PomodoroConfig): PomodoroConfig {
  if (!saved || typeof saved !== "object") return fallback;
  const s = saved as Record<string, unknown>;
  return {
    workMinutes: typeof s.workMinutes === "number" && s.workMinutes > 0 ? s.workMinutes : fallback.workMinutes,
    shortBreakMinutes:
      typeof s.shortBreakMinutes === "number" && s.shortBreakMinutes > 0 ? s.shortBreakMinutes : fallback.shortBreakMinutes,
    longBreakMinutes:
      typeof s.longBreakMinutes === "number" && s.longBreakMinutes > 0 ? s.longBreakMinutes : fallback.longBreakMinutes,
    longBreakInterval:
      typeof s.longBreakInterval === "number" && s.longBreakInterval > 0 ? s.longBreakInterval : fallback.longBreakInterval,
    autoStartBreaks: typeof s.autoStartBreaks === "boolean" ? s.autoStartBreaks : fallback.autoStartBreaks,
    autoStartWork: typeof s.autoStartWork === "boolean" ? s.autoStartWork : fallback.autoStartWork,
  };
}

// Shared by the study-session Pomodoro block and the standalone /pomodoro page — same
// preferences.pomodoro record the Spotify link already lives in (see SessionClient), so saving
// from either place must merge into that object rather than replace it, or one feature's save
// silently wipes the other's.
export function usePomodoroConfig() {
  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_POMODORO_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const profile = await res.json();
          setConfig(readConfig(profile?.preferences?.pomodoro, DEFAULT_POMODORO_CONFIG));
        }
      } catch {
        // keep defaults
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const saveConfig = useCallback(async (next: PomodoroConfig) => {
    setConfig(next); // optimistic — the timer should reflect the new durations immediately
    try {
      const current = await (await fetch("/api/profile")).json();
      const prevPomodoro = (current.preferences?.pomodoro ?? {}) as Record<string, unknown>;
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: { ...(current.preferences ?? {}), pomodoro: { ...prevPomodoro, ...next } },
        }),
      });
    } catch {
      // best-effort — config still applies locally this session even if the save failed
    }
  }, []);

  return { config, loaded, saveConfig };
}
