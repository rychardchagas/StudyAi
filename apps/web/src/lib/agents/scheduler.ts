/**
 * Scheduler Agent
 * Distributes study sessions across the week
 * Applies interleaving, proportional allocation and methodology selection
 */
import type { Discipline, CalendarEvent } from "@/types";
import { selectMethodology } from "@/lib/agents/pedagogy";

const DEFAULT_AVAIL: Record<number, number[]> = {
  0: [1, 2, 3, 12, 13, 14],
  1: [12, 13, 14],
  2: [1, 2, 3, 12, 13, 14],
  3: [1, 2, 3, 12, 13],
  4: [12, 13, 14],
  5: [2, 3, 4],
  6: [],
};

const PRI_BONUS: Record<string, number> = { Alta: 2, Média: 0, Baixa: -1 };

function pickModuleForSession(disc: Discipline, sc: number, asOf: number) {
  const mods = disc.modules ?? [];
  const inProg = mods.find((m) => m.status === "prog");
  const pend = mods.filter((m) => m.status === "pend");
  const done = mods.filter((m) => m.status === "done");
  if (sc % 3 === 2 && done.length) {
    // Real spaced-repetition due date (lib/utils/fsrs.ts::scheduleCard, wired in
    // sessions/complete) beats the rotation whenever something is actually due — a module you
    // just aced two weeks ago and one you're overdue on shouldn't get the same review slot.
    // `asOf` is "now" for this week (week 0) or a projected date for a future week being browsed
    // — a review due in 10 days shouldn't show as due when generating next week's plan.
    const due = done.filter((m) => m.fsrs_due_date && new Date(m.fsrs_due_date).getTime() <= asOf);
    if (due.length) return due[sc % due.length];
    return done[sc % done.length]; // nothing's due yet — keep the rotation so review slots aren't wasted
  }
  return inProg ?? pend[sc % pend.length] ?? done[0];
}

export interface GenerateCalendarOptions {
  /** Which week relative to the current real one — 0 = this week, 1 = next week, etc. Advances
   * the module rotation and spaced-review due-date projection so browsing forward shows genuine
   * progression instead of repeating week 0 verbatim. */
  weekIndex?: number;
  /** Monday=0..Sunday=6. Only meaningful when weekIndex is 0 (or omitted) — days before this one
   * are excluded from availability, since a student can't go back in time to attend a session
   * planned for a day of the current week that's already passed. */
  todayDayOfWeek?: number;
}

export function generateCalendar(
  disciplines: Discipline[],
  availSlots: Record<number, number[]> = DEFAULT_AVAIL,
  options: GenerateCalendarOptions = {}
): CalendarEvent[] {
  if (!disciplines.length) return [];

  const { weekIndex = 0, todayDayOfWeek } = options;
  const isCurrentWeek = weekIndex === 0;
  const asOf = Date.now() + weekIndex * 7 * 86_400_000;

  // On the current week, zero out days that have already gone by — every other week (browsed
  // forward) is entirely in the future and plannable in full.
  const effectiveAvail: Record<number, number[]> =
    isCurrentWeek && todayDayOfWeek !== undefined
      ? Object.fromEntries(Array.from({ length: 7 }, (_, day) => [day, day < todayDayOfWeek ? [] : availSlots[day] ?? []]))
      : availSlots;
  const isPastDay = (day: number) => isCurrentWeek && todayDayOfWeek !== undefined && day < todayDayOfWeek;

  const events: CalendarEvent[] = [];
  const placed = new Set<string>();
  const sessionCount: Record<string, number> = {};
  const fixedCount: Record<string, number> = {};

  // Recurring pinned slots (e.g. a fixed weekly class) are placed first and unconditionally —
  // they happen every week regardless of what's marked "available" for proportional scheduling.
  for (const disc of disciplines) {
    for (const { dayOfWeek, slotIndex } of disc.fixed_schedule ?? []) {
      if (isPastDay(dayOfWeek)) continue;
      const key = `${dayOfWeek}-${slotIndex}`;
      if (placed.has(key)) continue; // another discipline already claimed this slot — first one wins
      const sc = sessionCount[disc.id] ?? 0;
      const mod = pickModuleForSession(disc, sc, asOf);
      events.push({
        disciplineId: disc.id,
        disciplineName: disc.name,
        disciplineColor: disc.color,
        moduleId: mod?.id,
        moduleName: mod?.name ?? disc.name,
        dayOfWeek,
        slotIndex,
        methodology: "Aula Fixa",
        durationMinutes: 45,
      });
      placed.add(key);
      sessionCount[disc.id] = sc + 1;
      fixedCount[disc.id] = (fixedCount[disc.id] ?? 0) + 1;
    }
  }

  // Interleave slots across days first (Mon-slot, Tue-slot, Wed-slot, ...) instead of exhausting
  // one day before moving to the next. The round-robin discipline queue below is walked in this
  // same order — if `available` were sorted day-by-day instead, the queue's alignment with day
  // boundaries would be accidental, and a lower-weight discipline could land entirely on whichever
  // days happen to come first in the week instead of being spread across it.
  const available: Array<{ col: number; slot: number }> = [];
  const byDay = Array.from({ length: 7 }, (_, col) => [...(effectiveAvail[col] || [])].sort((a, b) => a - b));
  const maxPerDay = Math.max(0, ...byDay.map((d) => d.length));
  for (let r = 0; r < maxPerDay; r++) {
    for (let col = 0; col < 7; col++) {
      if (byDay[col][r] !== undefined) available.push({ col, slot: byDay[col][r] });
    }
  }

  const weights = disciplines.map((d) => Math.max(1, d.horas_semana + (PRI_BONUS[d.prioridade] ?? 0)));
  const totalW = weights.reduce((a, b) => a + b, 0);

  const allocations = disciplines.map((disc, i) => ({
    disc,
    count: Math.max(0, Math.round((weights[i] / totalW) * available.length * 0.88) - (fixedCount[disc.id] ?? 0)),
    used: 0,
  }));
  allocations.sort((a, b) => (PRI_BONUS[b.disc.prioridade] ?? 0) - (PRI_BONUS[a.disc.prioridade] ?? 0));

  // Advances each discipline's module-rotation pointer by however many sessions it would have
  // gotten in the weeks between now and the one being generated — otherwise every week just
  // replays week 0's rotation from the same starting point, which is exactly why browsing
  // forward used to show identical modules every time.
  if (weekIndex > 0) {
    for (const alloc of allocations) {
      sessionCount[alloc.disc.id] = (sessionCount[alloc.disc.id] ?? 0) + weekIndex * alloc.count;
    }
  }

  const queue: typeof allocations = [];
  for (let pass = 0; pass < 20; pass++) {
    allocations.forEach((a) => { if (a.used < a.count) { queue.push({ ...a }); a.used++; } });
  }

  const colLastDisc: Record<number, string> = {};
  let qi = 0;

  for (const { col, slot } of available) {
    if (qi >= queue.length) break;
    const key = `${col}-${slot}`;
    if (placed.has(key)) continue;

    // Look ahead in the queue for a different discipline before committing to this slot — done
    // *before* reading `alloc`/`disc` below, since queue[qi] is what actually gets placed; an
    // earlier version swapped queue entries but then still read the pre-swap reference, so the
    // swap never affected the slot it was meant to fix.
    if (colLastDisc[col] === queue[qi].disc.id && disciplines.length > 1) {
      for (let k = qi + 1; k < Math.min(qi + 5, queue.length); k++) {
        if (queue[k].disc.id !== queue[qi].disc.id) {
          [queue[qi], queue[k]] = [queue[k], queue[qi]];
          break;
        }
      }
      // If no swap candidate was found nearby, fall through and place this discipline anyway —
      // an occasional same-day repeat is better than silently dropping the session and leaving
      // an unexplained gap in the calendar.
    }

    const alloc = queue[qi];
    const disc = alloc.disc;

    const sc = sessionCount[disc.id] ?? 0;
    const mod = pickModuleForSession(disc, sc, asOf);
    const done = (disc.modules ?? []).filter((m) => m.status === "done");

    const daysToExam = disc.exam_date
      ? Math.max(0, Math.ceil((new Date(disc.exam_date).getTime() - asOf) / 86400000))
      : null;

    const methodology = selectMethodology(
      mod?.status ?? "pend",
      daysToExam,
      sc,
      mod ? { lapses: mod.fsrs_lapses, reps: mod.fsrs_reps } : undefined
    );
    const isReview = sc % 3 === 2 && done.length > 0;

    events.push({
      disciplineId: disc.id,
      disciplineName: disc.name,
      disciplineColor: disc.color,
      moduleId: mod?.id,
      moduleName: isReview ? `🔁 Revisão — ${mod?.name ?? "módulo anterior"}` : (mod?.name ?? disc.name),
      dayOfWeek: col,
      slotIndex: slot,
      methodology,
      durationMinutes: 45,
    });

    colLastDisc[col] = disc.id;
    sessionCount[disc.id] = sc + 1;
    placed.add(key);
    qi++;
  }

  return events;
}
