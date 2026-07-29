"use client";
import type { CalendarEvent } from "@/types";

interface EventDrawerProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onStartSession: (event: CalendarEvent) => void;
}

export function EventDrawer({ event, onClose, onStartSession }: EventDrawerProps) {
  if (!event) return null;

  const details: Array<[string, string]> = [
    ["Matéria", event.disciplineName],
    ["Módulo", event.moduleName],
    ["Metodologia IA", event.methodology],
    ["Duração", `${event.durationMinutes} min`],
  ];

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[80]" />
      <div className="fixed right-0 top-0 bottom-0 w-[330px] bg-surface border-l border-border z-[81] flex flex-col">
        <div className="p-3.5 pb-2.5 border-b border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="float-right w-[22px] h-[22px] rounded-md bg-card border border-border text-muted text-xs flex items-center justify-center cursor-pointer hover:text-txt transition-colors"
          >
            ✕
          </button>
          <div
            className="font-mono text-[10px] font-semibold tracking-wider uppercase rounded px-1.5 py-0.5 inline-block mb-1.5"
            style={{ background: `${event.disciplineColor}22`, color: event.disciplineColor }}
          >
            {event.disciplineName}
          </div>
          <div className="text-sm font-bold text-txt mb-1 leading-snug">{event.moduleName}</div>
          <div className="text-[11px] text-muted">
            Metodologia: <strong className="text-dim">{event.methodology}</strong>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5">
          <div className="font-mono text-[10px] font-semibold tracking-wider uppercase text-muted mb-2">Detalhes</div>
          {details.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-[11px] text-muted">{k}</span>
              <span className="font-mono text-[11px] text-txt text-right max-w-[180px] truncate">{v}</span>
            </div>
          ))}
        </div>

        <div className="p-2.5 px-3.5 border-t border-border flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onStartSession(event)}
            className="flex-1 text-sm font-semibold bg-primary text-white rounded-lg py-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          >
            ▶ Iniciar sessão
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs bg-card text-muted border border-border rounded-lg py-2.5 px-3.5 cursor-pointer hover:text-txt transition-colors"
          >
            Adiar
          </button>
        </div>
      </div>
    </>
  );
}
