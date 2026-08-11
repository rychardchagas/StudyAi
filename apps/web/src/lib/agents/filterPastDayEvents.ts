import type { CalendarEvent } from "@/types";

// The AI calendar-generation prompt tells the model not to schedule anything on a day of the
// current week that's already passed, but a small local model doesn't reliably comply (seen live
// — events landing on Monday in a Wednesday replan). The non-AI fallback generator enforces this
// in code by masking past days out of availability *before* generating (see generateCalendar's
// effectiveAvail); the AI path has no equivalent step of its own, so this is the after-the-fact
// safety net for it — never trust the prompt instruction alone.
export function filterPastDayEvents(events: CalendarEvent[], todayDayOfWeek: number): CalendarEvent[] {
  return events.filter((e) => e.dayOfWeek >= todayDayOfWeek);
}
