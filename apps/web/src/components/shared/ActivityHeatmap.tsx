"use client";
import { useMemo } from "react";
import { startOfWeekMonday } from "@/lib/utils/constants";
import type { StudySession } from "@/types";

interface ActivityHeatmapProps {
  sessions: StudySession[];
  weeksBack?: number;
}

// Gold intensity scale — same accent as the streak widget, so "more study activity" and
// "more gamified progress" read as the same visual language across the app.
const LEVEL_COLORS = [
  "oklch(var(--card2))",
  "oklch(var(--primary) / .25)",
  "oklch(var(--primary) / .5)",
  "oklch(var(--primary) / .75)",
  "oklch(var(--primary))",
];
const DAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg Ter Qua Qui Sex Sáb Dom

function heatLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

export function ActivityHeatmap({ sessions, weeksBack = 12 }: ActivityHeatmapProps) {
  const weeks = useMemo(() => {
    const countsByDay = new Map<string, number>();
    for (const s of sessions) {
      if (!s.completed) continue;
      const at = s.completed_at ?? s.scheduled_at;
      if (!at) continue;
      const key = new Date(at).toDateString();
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const currentWeekStart = startOfWeekMonday(new Date());
    const result: number[][] = [];
    for (let w = weeksBack - 1; w >= 0; w--) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - w * 7);
      const levels: number[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        levels.push(heatLevel(countsByDay.get(day.toDateString()) ?? 0));
      }
      result.push(levels);
    }
    return result;
  }, [sessions, weeksBack]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1 text-[10px] text-muted text-center">
        {DAY_LABELS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      {weeks.map((week, w) => (
        <div key={w} className="flex gap-0.5 mb-[3px]">
          {week.map((lvl, d) => (
            <div key={d} className="flex-1 h-4 rounded" style={{ background: LEVEL_COLORS[lvl] }} />
          ))}
        </div>
      ))}
      <div className="flex gap-1.5 items-center mt-1.5">
        <span className="text-[10px] text-muted">Menos</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
        ))}
        <span className="text-[10px] text-muted">Mais</span>
      </div>
    </div>
  );
}
