"use client";
import { useState, useCallback } from "react";
import { generateCalendar } from "@/lib/agents/scheduler";
import type { Discipline, CalendarEvent } from "@/types";

export function useCalendar(initialDisciplines: Discipline[]) {
  const [disciplines, setDisciplines] = useState(initialDisciplines);
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    generateCalendar(initialDisciplines)
  );
  const [generating, setGenerating] = useState(false);

  const regenerate = useCallback(
    async (discs: Discipline[], avail?: Record<number, number[]>) => {
      setGenerating(true);
      try {
        // Use AI-powered generation if available, fallback to local
        const res = await fetch("/api/calendar/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disciplines: discs, availability: avail }),
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events ?? generateCalendar(discs, avail));
        } else {
          setEvents(generateCalendar(discs, avail));
        }
      } catch {
        setEvents(generateCalendar(discs, avail));
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const addDiscipline = useCallback((disc: Discipline) => {
    const next = [...disciplines, disc];
    setDisciplines(next);
    regenerate(next);
  }, [disciplines, regenerate]);

  const removeDiscipline = useCallback((id: string) => {
    const next = disciplines.filter((d) => d.id !== id);
    setDisciplines(next);
    regenerate(next);
  }, [disciplines, regenerate]);

  const updateDiscipline = useCallback((id: string, updates: Partial<Discipline>) => {
    const next = disciplines.map((d) => d.id === id ? { ...d, ...updates } : d);
    setDisciplines(next);
  }, [disciplines]);

  return { disciplines, events, generating, regenerate, addDiscipline, removeDiscipline, updateDiscipline };
}
