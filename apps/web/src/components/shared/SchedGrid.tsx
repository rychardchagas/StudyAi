"use client";
import { DAYS_LABELS, SLOT_LABELS } from "@/lib/utils/constants";

interface SchedGridProps {
  slots: Record<string, boolean>;
  setSlots: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  /** Day index (0=Mon..6=Sun) reserved as a rest day — greyed out and not clickable. */
  disabledDay?: number | null;
}

export function SchedGrid({ slots, setSlots, disabledDay }: SchedGridProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {/* Hour labels — used to only be reachable via a hover tooltip (title={time}) on each
          cell, with nothing visible at a glance. Structurally mirrors the day header (same
          pb-1/border-b/mb-1) so its rows line up pixel-for-pixel with the day columns. */}
      <div className="shrink-0">
        <div className="h-[13px] pb-1 border-b border-border mb-1" />
        {SLOT_LABELS.map((time, si) => (
          <div
            key={si}
            className="h-[17px] mb-0.5 flex items-center font-mono text-[9px] text-muted pr-1 whitespace-nowrap"
          >
            {time}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 flex-1 min-w-0">
        {DAYS_LABELS.map((day, di) => {
          const isRestDay = disabledDay === di;
          return (
            <div key={di}>
              <div className="font-mono text-[10px] font-semibold text-center text-muted uppercase tracking-wide pb-1 border-b border-border mb-1">
                {day}
                {isRestDay && <span className="block text-[8px] normal-case text-primary">descanso</span>}
              </div>
              {SLOT_LABELS.map((time, si) => {
                const key = `${di}-${si}`;
                const active = !!slots[key] && !isRestDay;
                return (
                  <div
                    key={si}
                    title={isRestDay ? "Dia de descanso" : time}
                    onClick={() => !isRestDay && setSlots((p) => ({ ...p, [key]: !p[key] }))}
                    className={`h-[17px] rounded-sm mb-0.5 border transition-colors ${
                      isRestDay
                        ? "bg-card2/40 border-transparent cursor-not-allowed"
                        : active
                          ? "bg-primary/10 border-primary/30 cursor-pointer"
                          : "bg-card border-transparent cursor-pointer"
                    }`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
