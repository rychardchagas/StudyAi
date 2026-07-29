"use client";
import { DAYS_LABELS, SLOT_LABELS } from "@/lib/utils/constants";
import type { CalendarEvent } from "@/types";

interface CalGridProps {
  events: CalendarEvent[];
  onClickEvent: (ev: CalendarEvent) => void;
}

export function CalGrid({ events, onClickEvent }: CalGridProps) {
  return (
    <div className="flex-1 overflow-auto px-3.5 pb-3.5">
      <div className="grid grid-cols-[44px_repeat(7,minmax(90px,1fr))] gap-[3px] mb-[3px] min-w-[540px]">
        <div />
        {DAYS_LABELS.map((label) => (
          <div key={label} className="text-center py-1">
            <div className="font-mono text-[10px] font-medium tracking-wider uppercase text-muted">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[44px_repeat(7,minmax(90px,1fr))] gap-[3px] min-w-[540px]">
        <div className="flex flex-col">
          {SLOT_LABELS.map((t) => (
            <div
              key={t}
              className="h-[50px] flex items-start justify-end pt-0.5 pr-1.5 font-mono text-[10px] text-muted border-t border-white/[0.03]"
            >
              {t}
            </div>
          ))}
        </div>
        {DAYS_LABELS.map((_, dayIdx) => {
          const colEvents = events.filter((e) => e.dayOfWeek === dayIdx);
          return (
            <div key={dayIdx} className="flex flex-col gap-[3px] rounded-md">
              {SLOT_LABELS.map((_, slotIdx) => {
                const ev = colEvents.find((e) => e.slotIndex === slotIdx);
                return (
                  <div key={slotIdx} className="h-[50px] rounded-[5px] bg-white/[0.02] relative">
                    {ev && (
                      <button
                        type="button"
                        onClick={() => onClickEvent(ev)}
                        className="absolute inset-0.5 rounded flex flex-col justify-between overflow-hidden p-1.5 text-left text-white cursor-pointer"
                        style={{ background: ev.disciplineColor }}
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold leading-tight truncate">{ev.disciplineName}</div>
                          <div className="text-[9px] opacity-85 truncate">{ev.moduleName}</div>
                        </div>
                        <span className="self-start font-mono text-[8px] opacity-75 bg-black/20 rounded-sm px-1 py-0.5 truncate max-w-full">
                          {ev.methodology}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
