"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export function useTimer(initialSeconds: number = 25 * 60) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const total = initialSeconds;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setCompleted(true);
            return total;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, total]);

  const toggle = useCallback(() => { setRunning((p) => !p); setCompleted(false); }, []);
  const reset = useCallback(() => { setRunning(false); setSeconds(total); setCompleted(false); }, [total]);
  const skip = useCallback(() => { setSeconds(total); setRunning(false); }, [total]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return { seconds, running, completed, toggle, reset, skip, fmt, progress: 1 - seconds / total };
}
