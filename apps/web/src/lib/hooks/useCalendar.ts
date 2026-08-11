"use client";
import { useState, useCallback } from "react";
import { generateCalendar } from "@/lib/agents/scheduler";
import { validateCalendar } from "@/lib/agents/qa";
import type { Discipline, CalendarEvent } from "@/types";

// Monday=0..Sunday=6, matching CalendarEvent.dayOfWeek — used so the current week's generation
// can exclude days that have already passed (see generateCalendar's todayDayOfWeek option).
function todayDayOfWeekMonday(): number {
  return (new Date().getDay() + 6) % 7;
}

export function useCalendar(initialDisciplines: Discipline[], initialAvailability?: Record<number, number[]>) {
  const [disciplines, setDisciplines] = useState(initialDisciplines);
  const [availability, setAvailability] = useState(initialAvailability);
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    generateCalendar(initialDisciplines, initialAvailability, { todayDayOfWeek: todayDayOfWeekMonday() })
  );
  const [generating, setGenerating] = useState(false);

  const regenerate = useCallback(
    async (discs: Discipline[], avail?: Record<number, number[]>, studentContext?: string) => {
      setGenerating(true);
      setAvailability(avail);
      let usedAI = false;
      let qaIssues: string[] = [];
      const todayDayOfWeek = todayDayOfWeekMonday();
      // The QA Agent's conflict/interleaving checks used to only ever run inside the AI route
      // handler — any time that path failed for any reason (Ollama down, a malformed response,
      // a network hiccup) the local fallback below ran with zero conflict detection at all, not
      // just "sometimes" but every single time the AI path wasn't used. validateCalendar is a
      // pure function (no server-only deps), so it can run here too.
      const localFallback = () => {
        const events = generateCalendar(discs, avail, { todayDayOfWeek });
        setEvents(events);
        qaIssues = validateCalendar(events, discs).issues;
      };
      try {
        // Use AI-powered generation if available, fallback to local
        const res = await fetch("/api/calendar/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disciplines: discs, availability: avail, studentContext, todayDayOfWeek }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.events) {
            setEvents(data.events);
            usedAI = true;
            qaIssues = data.qa?.issues ?? [];
          } else {
            localFallback();
          }
        } else {
          localFallback();
        }
      } catch {
        localFallback();
      } finally {
        setGenerating(false);
      }
      return { usedAI, qaIssues };
    },
    []
  );

  const addDiscipline = useCallback((disc: Discipline) => {
    const next = [...disciplines, disc];
    setDisciplines(next);
    regenerate(next, availability);
  }, [disciplines, availability, regenerate]);

  const removeDiscipline = useCallback((id: string) => {
    const next = disciplines.filter((d) => d.id !== id);
    setDisciplines(next);
    regenerate(next, availability);
  }, [disciplines, availability, regenerate]);

  const updateDiscipline = useCallback((id: string, updates: Partial<Discipline>) => {
    const next = disciplines.map((d) => d.id === id ? { ...d, ...updates } : d);
    setDisciplines(next);
  }, [disciplines]);

  return { disciplines, events, availability, generating, regenerate, addDiscipline, removeDiscipline, updateDiscipline };
}
