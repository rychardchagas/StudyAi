"use client";
import { DAYS_LABELS, SLOT_LABELS } from "@/lib/utils/constants";

interface SchedGridProps {
  slots: Record<string, boolean>;
  setSlots: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export function SchedGrid({ slots, setSlots }: SchedGridProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5 overflow-x-auto">
      {DAYS_LABELS.map((day, di) => (
        <div key={di}>
          <div className="font-mono text-[10px] font-semibold text-center text-muted uppercase tracking-wide pb-1 border-b border-border mb-1">
            {day}
          </div>
          {SLOT_LABELS.map((time, si) => {
            const key = `${di}-${si}`;
            const active = !!slots[key];
            return (
              <div
                key={si}
                title={time}
                onClick={() => setSlots((p) => ({ ...p, [key]: !p[key] }))}
                className={`h-[17px] rounded-sm cursor-pointer mb-0.5 border transition-colors ${
                  active ? "bg-primary/10 border-primary/30" : "bg-card border-transparent"
                }`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
