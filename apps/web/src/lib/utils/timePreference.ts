import { SLOT_LABELS } from "@/lib/utils/constants";

export type DayPeriod = "manhã" | "tarde" | "noite";

// Hour range per period, resolved against SLOT_LABELS by label lookup rather than hardcoded
// indices — SLOT_LABELS.length/contents already changed once (06h–21h → 04h–00h) and a previous
// version of this file hardcoded [0,5]/[6,11]/[12,15], which would have silently pointed at the
// wrong hours the moment the calendar's visible range changed. Resolving by label instead means
// this stays correct automatically if SLOT_LABELS is ever resized again.
const PERIOD_HOUR_RANGE: Record<DayPeriod, [number, number]> = {
  "manhã": [6, 11],
  tarde: [12, 17],
  noite: [18, 23],
};

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}h`;
}

const PERIOD_SLOT_RANGE: Record<DayPeriod, [number, number]> = Object.fromEntries(
  (Object.keys(PERIOD_HOUR_RANGE) as DayPeriod[]).map((period) => {
    const [startHour, endHour] = PERIOD_HOUR_RANGE[period];
    return [period, [SLOT_LABELS.indexOf(hourLabel(startHour)), SLOT_LABELS.indexOf(hourLabel(endHour))]];
  })
) as Record<DayPeriod, [number, number]>;

// JS's \b is ASCII-only (based on \w = [A-Za-z0-9_]) even with the /u flag — "ã" doesn't count as
// a word character, so \bmanh[ãa]s?\b silently never matched "manhã" (the boundary check fails
// right at the ã). Unicode-aware lookaround (\p{L} = any letter, under /u) instead of \b avoids
// that trap for the one keyword that has an accented character at its edge.
const PERIOD_KEYWORDS: Record<DayPeriod, RegExp> = {
  "manhã": /(?<!\p{L})manh[ãa]s?(?!\p{L})|(?<!\p{L})matinal(?!\p{L})/iu,
  tarde: /\btarde(s)?\b|\bvespertino\b/i,
  noite: /\bnoite(s)?\b|\bnoturn[oa]\b/i,
};

export interface DetectedPeriod {
  period: DayPeriod;
  label: string;
  hourRange: string; // e.g. "18h–21h", for display
  slotRange: [number, number];
}

// Deliberately simple substring/keyword matching, not sentiment analysis — "prefiro estudar à
// noite" and "só tenho manhãs livres" both just need the period word to show up. False positives
// (e.g. "não gosto de estudar de manhã") are possible but low-stakes: this only ever produces an
// opt-in suggestion the student can ignore, never an automatic change.
export function detectPreferredPeriods(bio: string): DetectedPeriod[] {
  if (!bio?.trim()) return [];
  const found: DetectedPeriod[] = [];
  for (const period of Object.keys(PERIOD_KEYWORDS) as DayPeriod[]) {
    if (PERIOD_KEYWORDS[period].test(bio)) {
      const [start, end] = PERIOD_SLOT_RANGE[period];
      found.push({
        period,
        label: period.charAt(0).toUpperCase() + period.slice(1),
        hourRange: `${SLOT_LABELS[start]}–${SLOT_LABELS[end]}`,
        slotRange: [start, end],
      });
    }
  }
  return found;
}

// Weekday-only (Mon-Fri, indices 0-4) — matches the app's own defaultSlots() convention elsewhere;
// weekends are left for the student to add by hand since weekend routines vary more.
export function applyPeriodToSlots(
  slots: Record<string, boolean>,
  slotRange: [number, number]
): Record<string, boolean> {
  const next = { ...slots };
  const [start, end] = slotRange;
  for (let day = 0; day < 5; day++) {
    for (let si = start; si <= end; si++) {
      next[`${day}-${si}`] = true;
    }
  }
  return next;
}
