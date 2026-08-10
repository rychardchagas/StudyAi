// Pure compute functions behind the /pomodoro Insights sub-tabs (Hoje/Semana/Histórico) —
// deliberately scoped down from pomotroid's stats engine (see the note on PomodoroConfig in
// usePomodoro.ts): no "completion rate" here, since honestly computing one requires tracking
// abandoned rounds too, which this app doesn't instrument. Rounds/focus time are real numbers
// from real logged data, nothing estimated.
export interface PomodoroRoundLike {
  completed_at: string;
  focus_minutes: number;
}

export interface TodayPomodoroStats {
  rounds: number;
  focusMinutes: number;
  byHour: number[]; // 24 entries, index = hour of day (0-23)
}

export function calcTodayPomodoroStats(rounds: PomodoroRoundLike[], now: Date = new Date()): TodayPomodoroStats {
  const todayKey = now.toDateString();
  const todays = rounds.filter((r) => new Date(r.completed_at).toDateString() === todayKey);
  const byHour = Array(24).fill(0) as number[];
  for (const r of todays) byHour[new Date(r.completed_at).getHours()]++;
  return {
    rounds: todays.length,
    focusMinutes: todays.reduce((sum, r) => sum + r.focus_minutes, 0),
    byHour,
  };
}

export interface DayRoundCount {
  date: string; // "YYYY-MM-DD"
  rounds: number;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Oldest -> today, 7 entries — same convention as lib/agents/progress.ts::last7Days.
export function calcWeekPomodoroStats(rounds: PomodoroRoundLike[], now: Date = new Date()): DayRoundCount[] {
  const countsByDate = new Map<string, number>();
  for (const r of rounds) {
    const key = dateKey(new Date(r.completed_at));
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }
  const days: DayRoundCount[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    days.push({ date: key, rounds: countsByDate.get(key) ?? 0 });
  }
  return days;
}

// Same shape/logic as calcStreakDays in lib/agents/progress.ts, applied to Pomodoro rounds
// instead of study_sessions — a separate streak on purpose, since standalone Pomodoro use isn't
// tied to actual studying (reading, chores, work outside StudyAI all count here).
export function calcPomodoroStreak(rounds: PomodoroRoundLike[], now: Date = new Date()): number {
  const daysWithRounds = new Set(rounds.map((r) => new Date(r.completed_at).toDateString()));
  let streak = 0;
  const cursor = new Date(now);
  while (daysWithRounds.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
