"use client";
import { DAYS_LABELS, SLOT_LABELS } from "@/lib/utils/constants";
import type { CalendarEvent } from "@/types";

interface CalGridProps {
  events: CalendarEvent[];
  onClickEvent: (ev: CalendarEvent) => void;
  weekDates?: Date[]; // 7 entries, Monday..Sunday of the displayed week
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalGrid({ events, onClickEvent, weekDates }: CalGridProps) {
  const today = new Date();

  return (
    <div className="flex-1 overflow-auto px-3.5 pb-3.5">
      <div className="grid grid-cols-[32px_repeat(7,minmax(52px,1fr))] gap-[3px] mb-[3px] min-w-[400px]">
        <div />
        {DAYS_LABELS.map((label, i) => {
          const date = weekDates?.[i];
          const isToday = date ? isSameDay(date, today) : false;
          return (
            <div key={label} className="text-center py-1">
              <div className="font-mono text-[10px] font-medium tracking-wider uppercase text-muted">{label}</div>
              {date && (
                <div
                  className={`mx-auto mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[13px] font-semibold ${
                    isToday ? "bg-primary/15 text-primary" : "text-dim"
                  }`}
                >
                  {date.getDate()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[32px_repeat(7,minmax(52px,1fr))] gap-[3px] min-w-[400px]">
        <div className="flex flex-col">
          {SLOT_LABELS.map((t) => (
            <div
              key={t}
              className="h-9 sm:h-[42px] flex items-start justify-end pt-0.5 pr-1 font-mono text-[9px] sm:text-[10px] text-muted border-t border-white/[0.03]"
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
                  <div key={slotIdx} className="h-9 sm:h-[42px] rounded-[5px] bg-white/[0.02] relative">
                    {ev && (
                      <button
                        type="button"
                        onClick={() => onClickEvent(ev)}
                        title={`${ev.disciplineName} — ${ev.moduleName}\n${ev.methodology} · ${ev.durationMinutes} min${
                          ev.done ? "\n✓ Concluída esta semana" : ""
                        }`}
                        className={`absolute inset-0.5 rounded flex flex-col justify-between overflow-hidden p-1.5 text-left text-white cursor-pointer ${
                          ev.done ? "opacity-60" : ""
                        }`}
                        style={{ background: ev.disciplineColor }}
                      >
                        {ev.done && (
                          <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/90 text-[9px] font-bold text-success">
                            ✓
                          </div>
                        )}
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
