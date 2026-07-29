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
      const isFixed = sorted[i].methodology === "Aula Fixa" || sorted[i - 1].methodology === "Aula Fixa";
      if (!isFixed && sorted[i].disciplineId === sorted[i - 1].disciplineId && sorted.length > 1) {
        issues.push(`Interleaving violado: ${sorted[i].disciplineName} aparece em slots consecutivos no dia ${day}.`);
      }
    }
  }

  // Two disciplines pinned to the exact same recurring day/slot — the scheduler resolves
  // this "first one wins", silently dropping the loser's session, so flag it explicitly.
  const fixedSlotOwners = new Map<string, string[]>();
  for (const disc of disciplines) {
    for (const { dayOfWeek, slotIndex } of disc.fixed_schedule ?? []) {
      const key = `${dayOfWeek}-${slotIndex}`;
      fixedSlotOwners.set(key, [...(fixedSlotOwners.get(key) ?? []), disc.name]);
    }
  }
  for (const [key, names] of fixedSlotOwners) {
    if (names.length > 1) {
      const [day, slot] = key.split("-");
      issues.push(
        `Conflito de horário fixo: ${names.join(" e ")} disputam o mesmo horário (dia ${day}, slot ${slot}).`
      );
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
