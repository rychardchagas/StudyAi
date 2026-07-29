/**
 * Notification Agent
 * Produces reminder and report data for local, in-app delivery (e.g. react-hot-toast) —
 * no email/push since this app runs locally with no backend to send them from.
 */
import type { StudySession } from "@/types";

export interface Reminder {
  sessionId: string;
  message: string;
  minutesUntil: number;
}

export function getDueReminders(sessions: StudySession[], now: Date = new Date(), windowMinutes = 15): Reminder[] {
  return sessions
    .filter((s) => !s.completed)
    .map((s) => {
      const minutesUntil = Math.round((new Date(s.scheduled_at).getTime() - now.getTime()) / 60000);
      return { sessionId: s.id, minutesUntil };
    })
    .filter((r) => r.minutesUntil >= 0 && r.minutesUntil <= windowMinutes)
    .map((r) => ({
      ...r,
      message:
        r.minutesUntil === 0
          ? "Sua sessão de estudo começa agora."
          : `Sua sessão de estudo começa em ${r.minutesUntil} min.`,
    }));
}

export interface WeeklyReport {
  completedSessions: number;
  totalSessions: number;
  totalMinutes: number;
}

export function getWeeklyReport(sessions: StudySession[], now: Date = new Date()): WeeklyReport {
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = sessions.filter((s) => new Date(s.scheduled_at) >= weekStart);
  const completed = thisWeek.filter((s) => s.completed);

  return {
    completedSessions: completed.length,
    totalSessions: thisWeek.length,
    totalMinutes: completed.reduce((sum, s) => sum + s.duration_minutes, 0),
  };
}
