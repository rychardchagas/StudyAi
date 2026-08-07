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

function pickModuleForSession(disc: Discipline, sc: number, asOf: number, allCovered: boolean) {
  const mods = disc.modules ?? [];
  const inProg = mods.find((m) => m.status === "prog");
  const pend = mods.filter((m) => m.status === "pend");
  const done = mods.filter((m) => m.status === "done");

  // Once the projected pace has covered every pending module by this week (see contentCovered
  // in generateCalendar), there's no "new" content left to schedule — everything becomes spaced
  // review across the whole discipline instead of looping the same modules forever as if they
  // were still fresh. Real FSRS due dates still take priority within that review pool.
  const reviewPool = allCovered ? mods : done;
  if ((allCovered || sc % 3 === 2) && reviewPool.length) {
    // `asOf` is "now" for this week (week 0) or a projected date for a future week being browsed
    // — a review due in 10 days shouldn't show as due when generating next week's plan.
    const due = reviewPool.filter((m) => m.fsrs_due_date && new Date(m.fsrs_due_date).getTime() <= asOf);
    if (due.length) return due[sc % due.length];
    return reviewPool[sc % reviewPool.length]; // nothing's due yet — keep the rotation so review slots aren't wasted
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

  // Interleave slots across days first (Mon-slot, Tue-slot, Wed-slot, ...) instead of exhausting
  // one day before moving to the next — computed up front (doesn't depend on the fixed-schedule
  // loop below) so its length is available for the content-covered estimate next.
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

  // A discipline's content isn't infinite — once its current weekly pace would have covered all
  // pending modules by the week being generated, stop treating it as having "new" content to
  // schedule (mirrors calcETA in lib/utils/fsrs.ts, in sessions rather than hours since the
  // rotation itself works in sessions). Rough estimate (doesn't subtract fixed-schedule slots)
  // since this only gates a projection, not the precise weekly allocation computed below.
  const contentCovered: Record<string, boolean> = {};
  disciplines.forEach((disc, i) => {
    const pendCount = (disc.modules ?? []).filter((m) => m.status !== "done").length;
    if (pendCount === 0) {
      contentCovered[disc.id] = true;
      return;
    }
    const roughWeeklyQuota = Math.max(1, Math.round((weights[i] / totalW) * available.length * 0.88));
    contentCovered[disc.id] = weekIndex >= Math.ceil(pendCount / roughWeeklyQuota);
  });

  // Recurring pinned slots (e.g. a fixed weekly class) are placed first and unconditionally —
  // they happen every week regardless of what's marked "available" for proportional scheduling.
  for (const disc of disciplines) {
    for (const { dayOfWeek, slotIndex } of disc.fixed_schedule ?? []) {
      if (isPastDay(dayOfWeek)) continue;
      const key = `${dayOfWeek}-${slotIndex}`;
      if (placed.has(key)) continue; // another discipline already claimed this slot — first one wins
      const sc = sessionCount[disc.id] ?? 0;
      const mod = pickModuleForSession(disc, sc, asOf, contentCovered[disc.id]);
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
    const allCovered = contentCovered[disc.id];
    const mod = pickModuleForSession(disc, sc, asOf, allCovered);
    const done = (disc.modules ?? []).filter((m) => m.status === "done");

    const daysToExam = disc.exam_date
      ? Math.max(0, Math.ceil((new Date(disc.exam_date).getTime() - asOf) / 86400000))
      : null;

    // Once content is fully covered, treat the module as "done" for methodology purposes too
    // (real recall/review), regardless of its actual DB status — this is a projection of where
    // the student *should* be at this pace, not a claim about what's actually been marked done.
    const methodology = selectMethodology(
      allCovered ? "done" : mod?.status ?? "pend",
      daysToExam,
      sc,
      mod ? { lapses: mod.fsrs_lapses, reps: mod.fsrs_reps } : undefined
    );
    const isReview = allCovered || (sc % 3 === 2 && done.length > 0);

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
