"use client";
import { useState } from "react";
import type { PomodoroConfig } from "@/lib/hooks/usePomodoro";

interface PomodoroSettingsPanelProps {
  config: PomodoroConfig;
  onSave: (next: PomodoroConfig) => void;
  onClose: () => void;
}

const fieldCls =
  "w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-txt outline-none focus:border-primary/50";
const labelCls = "text-[10px] font-semibold uppercase tracking-wide text-muted block mb-1";

// Mirrors the durations/cadence pomofocus.io exposes in its gear-icon settings panel — see the
// scoping note on PomodoroConfig in usePomodoro.ts for what was deliberately left out.
export function PomodoroSettingsPanel({ config, onSave, onClose }: PomodoroSettingsPanelProps) {
  const [draft, setDraft] = useState(config);

  function num(v: string, fallback: number): number {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 180) : fallback;
  }

  return (
    <div className="rounded-lg border border-border bg-card2 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-txt">Configurar Pomodoro</span>
        <button type="button" onClick={onClose} className="text-muted hover:text-txt" title="Fechar">
          ✕
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2.5">
        <div>
          <label className={labelCls}>Foco (min)</label>
          <input
            type="number"
            min={1}
            max={180}
            value={draft.workMinutes}
            onChange={(e) => setDraft((d) => ({ ...d, workMinutes: num(e.target.value, d.workMinutes) }))}
            className={fieldCls}
          />
        </div>
        <div>
          <label className={labelCls}>Pausa curta (min)</label>
          <input
            type="number"
            min={1}
            max={180}
            value={draft.shortBreakMinutes}
            onChange={(e) => setDraft((d) => ({ ...d, shortBreakMinutes: num(e.target.value, d.shortBreakMinutes) }))}
            className={fieldCls}
          />
        </div>
        <div>
          <label className={labelCls}>Pausa longa (min)</label>
          <input
            type="number"
            min={1}
            max={180}
            value={draft.longBreakMinutes}
            onChange={(e) => setDraft((d) => ({ ...d, longBreakMinutes: num(e.target.value, d.longBreakMinutes) }))}
            className={fieldCls}
          />
        </div>
      </div>

      <div className="mb-2.5">
        <label className={labelCls}>Pausa longa a cada quantos ciclos de foco</label>
        <input
          type="number"
          min={1}
          max={12}
          value={draft.longBreakInterval}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              longBreakInterval: Number.isFinite(Number(e.target.value)) && Number(e.target.value) > 0
                ? Math.min(Number(e.target.value), 12)
                : d.longBreakInterval,
            }))
          }
          className={`${fieldCls} w-24`}
        />
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        <label className="flex items-center gap-2 text-xs text-dim cursor-pointer">
          <input
            type="checkbox"
            checked={draft.autoStartBreaks}
            onChange={(e) => setDraft((d) => ({ ...d, autoStartBreaks: e.target.checked }))}
            className="accent-primary"
          />
          Iniciar pausas automaticamente
        </label>
        <label className="flex items-center gap-2 text-xs text-dim cursor-pointer">
          <input
            type="checkbox"
            checked={draft.autoStartWork}
            onChange={(e) => setDraft((d) => ({ ...d, autoStartWork: e.target.checked }))}
            className="accent-primary"
          />
          Iniciar foco automaticamente após a pausa
        </label>
      </div>

      <button
        type="button"
        onClick={() => {
          onSave(draft);
          onClose();
        }}
        className="w-full rounded-md bg-primary py-1.5 text-xs font-semibold text-bg"
      >
        Salvar
      </button>
    </div>
  );
}
