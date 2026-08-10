export const DAYS_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
// 04h–23h plus 00h (meia-noite) as the last slot — 21 hourly blocks covering the whole day except
// the deep-sleep window (01h–03h). Every consumer (SchedGrid, CalGrid, Settings' "marcar tudo",
// timePreference.ts) derives its slot count/labels from this array rather than hardcoding a
// length, so it's the only place that needs to change to resize the calendar's visible hours.
export const SLOT_LABELS = [
  "04h", "05h", "06h", "07h", "08h", "09h", "10h", "11h",
  "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h",
  "20h", "21h", "22h", "23h", "00h",
];

export function startOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Converts the SchedGrid boolean map ("dayIndex-slotIndex" -> boolean) into the
// Record<dayOfWeek, slotIndex[]> shape the Scheduler Agent (generateCalendar) expects.
export function toAvailabilityRecord(slots: Record<string, boolean> | undefined): Record<number, number[]> | undefined {
  if (!slots) return undefined;
  const availability: Record<number, number[]> = {};
  for (let day = 0; day < 7; day++) {
    availability[day] = Object.keys(slots)
      .filter((k) => k.startsWith(`${day}-`) && slots[k])
      .map((k) => Number(k.split("-")[1]));
  }
  return availability;
}
