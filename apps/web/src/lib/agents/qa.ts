/**
 * QA Agent
 * Validates a generated calendar before it's delivered to the client —
 * no back-to-back same-discipline slots, no empty calendar, exams get coverage.
 */
import type { CalendarEvent, Discipline } from "@/types";

export interface QAResult {
  valid: boolean;
  issues: string[];
}

export function validateCalendar(events: CalendarEvent[], disciplines: Discipline[] = []): QAResult {
  const issues: string[] = [];

  if (!events.length && disciplines.length) {
    issues.push("Calendário vazio apesar de haver disciplinas cadastradas.");
  }

  const byDay = new Map<number, CalendarEvent[]>();
  for (const e of events) {
    byDay.set(e.dayOfWeek, [...(byDay.get(e.dayOfWeek) ?? []), e]);
  }
  for (const [day, dayEvents] of byDay) {
    const sorted = [...dayEvents].sort((a, b) => a.slotIndex - b.slotIndex);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].disciplineId === sorted[i - 1].disciplineId && sorted.length > 1) {
        issues.push(`Interleaving violado: ${sorted[i].disciplineName} aparece em slots consecutivos no dia ${day}.`);
      }
    }
  }

  const now = Date.now();
  const urgent = disciplines.filter(
    (d) => d.exam_date && Math.ceil((new Date(d.exam_date).getTime() - now) / 86400000) < 14
  );
  for (const disc of urgent) {
    if (!events.some((e) => e.disciplineId === disc.id)) {
      issues.push(`${disc.name} tem prova em menos de 14 dias mas não recebeu nenhuma sessão.`);
    }
  }

  return { valid: issues.length === 0, issues };
}
