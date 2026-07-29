export const DAYS_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const SLOT_LABELS = [
  "06h", "07h", "08h", "09h", "10h", "11h", "12h", "13h",
  "14h", "15h", "16h", "17h", "18h", "19h", "20h", "21h",
];

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
