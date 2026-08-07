"use client";
import type { CalendarEvent } from "@/types";

interface EventDrawerProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onStartSession: (event: CalendarEvent) => void;
  onMarkDone: (event: CalendarEvent) => void;
  markingDone?: boolean;
}

export function EventDrawer({ event, onClose, onStartSession, onMarkDone, markingDone }: EventDrawerProps) {
  if (!event) return null;

  const details: Array<[string, string]> = [
    ["Matéria", event.disciplineName],
    ["Módulo", event.moduleName],
    ["Metodologia IA", event.methodology],
    ["Duração", `${event.durationMinutes} min`],
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-4 pb-3 border-b border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="float-right w-[22px] h-[22px] rounded-md bg-card border border-border text-muted text-xs flex items-center justify-center cursor-pointer hover:text-txt transition-colors"
          >
            ✕
          </button>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="font-mono text-[10px] font-semibold tracking-wider uppercase rounded px-1.5 py-0.5 inline-block"
              style={{ background: `${event.disciplineColor}22`, color: event.disciplineColor }}
            >
              {event.disciplineName}
            </div>
            {event.done && (
              <div className="font-mono text-[10px] font-semibold tracking-wider uppercase rounded px-1.5 py-0.5 inline-block bg-success/15 text-success">
                ✓ Concluída esta semana
              </div>
            )}
          </div>
          <div className="text-sm font-bold text-txt mb-1 leading-snug">{event.moduleName}</div>
          <div className="text-[11px] text-muted">
            Metodologia: <strong className="text-dim">{event.methodology}</strong>
          </div>
        </div>

        <div className="p-4">
          <div className="font-mono text-[10px] font-semibold tracking-wider uppercase text-muted mb-2">Detalhes</div>
          {details.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-b-0">
              <span className="text-[11px] text-muted">{k}</span>
              <span className="font-mono text-[11px] text-txt text-right max-w-[180px] truncate">{v}</span>
            </div>
          ))}
        </div>

        <div className="p-3 pt-0 shrink-0 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onStartSession(event)}
            className="w-full text-sm font-semibold bg-primary text-bg rounded-lg py-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          >
            ▶ Iniciar sessão
          </button>
          {!event.done && (
            <button
              type="button"
              onClick={() => onMarkDone(event)}
              disabled={markingDone}
              className="w-full text-[13px] font-semibold border border-success/30 bg-success/10 text-success rounded-lg py-2 cursor-pointer hover:bg-success/15 transition-colors disabled:opacity-60"
            >
              {markingDone ? "Marcando…" : "✓ Marcar como concluída"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
