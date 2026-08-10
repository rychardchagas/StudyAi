"use client";
// Standalone Pomodoro — same timer engine as the study session's Pomodoro mode
// (lib/hooks/usePomodoro), but with no discipline/module tied to it. For any general-purpose
// focus block: reading, chores, work outside of StudyAI's own study flow.
// Sub-tabs (Timer/Hoje/Semana/Histórico) mirror github.com/Splode/pomotroid's stats window —
// see the scoping note on PomodoroConfig in usePomodoro.ts for what was deliberately left out
// (no "completion rate": that needs abandoned-round tracking this app doesn't instrument).
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { usePomodoro } from "@/lib/hooks/usePomodoro";
import { usePomodoroConfig } from "@/lib/hooks/usePomodoroConfig";
import { usePomodoroRoundLogger } from "@/lib/hooks/usePomodoroRoundLogger";
import { PomodoroSettingsPanel } from "@/components/shared/PomodoroSettingsPanel";
import { MusicPanel } from "@/components/shared/MusicPanel";
import { ActivityHeatmap } from "@/components/shared/ActivityHeatmap";
import {
  calcTodayPomodoroStats,
  calcWeekPomodoroStats,
  calcPomodoroStreak,
  type PomodoroRoundLike,
} from "@/lib/utils/pomodoroStats";
import { DAYS_LABELS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

const PHASE_LABEL: Record<string, string> = {
  work: "Foco",
  "short-break": "Pausa curta",
  "long-break": "Pausa longa",
};

type Tab = "timer" | "today" | "week" | "history";
const TABS: [Tab, string][] = [
  ["timer", "Timer"],
  ["today", "Hoje"],
  ["week", "Semana"],
  ["history", "Histórico"],
];

function fmtFocusTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function PomodoroClient() {
  const { config, saveConfig } = usePomodoroConfig();
  const pomodoro = usePomodoro(config);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<Tab>("timer");
  const [rounds, setRounds] = useState<PomodoroRoundLike[]>([]);

  useEffect(() => {
    if (!pomodoro.justTransitioned) return;
    if (pomodoro.justTransitioned === "work") {
      toast("☕ Pausa acabou — volta pro foco.", { icon: "☕" });
    } else if (pomodoro.justTransitioned === "long-break") {
      toast("🎉 Ciclo completo — hora da pausa longa!", { icon: "🎉" });
    } else {
      toast("🍅 Pomodoro concluído — hora da pausa!", { icon: "🍅" });
    }
    pomodoro.clearTransition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.justTransitioned]);
  usePomodoroRoundLogger(pomodoro.justTransitioned, config.workMinutes);

  useEffect(() => {
    fetch("/api/pomodoro/rounds")
      .then((res) => (res.ok ? res.json() : []))
      .then(setRounds)
      .catch(() => {});
    // Re-fetch whenever a round just completed, so Hoje/Semana/Histórico stay live without a
    // page reload — a redundant extra fetch when justTransitioned clears back to null is
    // harmless (idempotent GET).
  }, [pomodoro.justTransitioned]);

  // Keyboard shortcut, matching the session screen's convention.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === " " && tab === "timer") {
        e.preventDefault();
        pomodoro.toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.toggle, tab]);

  const today = useMemo(() => calcTodayPomodoroStats(rounds), [rounds]);
  const week = useMemo(() => calcWeekPomodoroStats(rounds), [rounds]);
  const streak = useMemo(() => calcPomodoroStreak(rounds), [rounds]);
  const weekTotal = week.reduce((sum, d) => sum + d.rounds, 0);
  const lifetimeRounds = rounds.length;
  const lifetimeHours = Math.round((rounds.reduce((sum, r) => sum + r.focus_minutes, 0) / 60) * 10) / 10;

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pomodoro.progress);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-4">
        <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
          Foco
        </div>
        <div className="font-serif text-lg font-semibold text-txt">Pomodoro</div>
        <p className="mt-1 text-xs text-dim">
          Timer independente de qualquer matéria — use pra qualquer bloco de foco, dentro ou fora
          do StudyAI.
        </p>
      </div>

      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "border-b-2 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors",
              tab === id ? "border-primary text-primary" : "border-transparent text-muted hover:text-dim"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "timer" && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center w-full">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-[220px] w-[380px] -translate-x-1/2 bg-[radial-gradient(ellipse,oklch(var(--primary)/0.1)_0%,transparent_70%)]" />

            <div className="relative mb-1 text-sm font-semibold text-txt">
              {PHASE_LABEL[pomodoro.phase]}
            </div>
            <div className="relative mb-5 text-[11px] text-muted">
              {pomodoro.cyclesCompleted} {pomodoro.cyclesCompleted === 1 ? "ciclo completo" : "ciclos completos"}
            </div>

            <div className="relative mx-auto mb-5 h-[240px] w-[240px]">
              <svg width="240" height="240" className="-rotate-90">
                <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="8" />
                <defs>
                  <linearGradient id="pomo-ring" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="oklch(var(--primary))" />
                    <stop offset="100%" stopColor="oklch(var(--secondary))" />
                  </linearGradient>
                </defs>
                <circle
                  cx="120"
                  cy="120"
                  r={radius}
                  fill="none"
                  stroke="url(#pomo-ring)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset .5s ease" }}
                  className={pomodoro.running ? "drop-shadow-[0_0_10px_oklch(var(--primary))]" : ""}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono text-[52px] font-light leading-none text-txt">
                  {pomodoro.fmt(pomodoro.seconds)}
                </div>
              </div>
            </div>

            <div className="relative mb-4 flex justify-center gap-3">
              <button
                onClick={pomodoro.reset}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-border bg-card2 text-dim"
              >
                ↺
              </button>
              <button
                onClick={pomodoro.toggle}
                className={cn(
                  "flex h-[64px] w-[64px] items-center justify-center rounded-2xl text-2xl transition-all",
                  pomodoro.running ? "border border-danger bg-danger/15 text-danger" : "bg-primary text-bg"
                )}
              >
                {pomodoro.running ? "⏸" : "▶"}
              </button>
              <button
                onClick={pomodoro.skip}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-border bg-card2 text-dim"
              >
                ⏭
              </button>
            </div>

            <div className="relative flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                title="Configurar durações"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card2 text-[11px] text-dim hover:text-txt"
              >
                ⚙️
              </button>
            </div>

            <div className="relative mt-3 font-mono text-[11px] text-muted">Space = play/pause</div>
          </div>

          {showSettings && (
            <div className="w-full">
              <PomodoroSettingsPanel config={config} onSave={saveConfig} onClose={() => setShowSettings(false)} />
            </div>
          )}

          <MusicPanel active={pomodoro.running} className="w-full" />
        </div>
      )}

      {tab === "today" && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-border bg-card p-3.5 text-center">
              <div className="font-mono text-2xl font-semibold text-txt">{today.rounds}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">rounds hoje</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3.5 text-center">
              <div className="font-mono text-2xl font-semibold text-txt">{fmtFocusTime(today.focusMinutes)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">tempo de foco</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3.5">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Rounds por hora
            </div>
            {today.rounds === 0 ? (
              <p className="py-4 text-center text-xs text-muted">Nenhum round completo hoje ainda.</p>
            ) : (
              <div className="flex items-end gap-[3px] h-[80px]">
                {today.byHour.map((count, hour) => {
                  const max = Math.max(1, ...today.byHour);
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${hour}h — ${count}`}>
                      <div
                        className="w-full rounded-t-sm bg-primary/70"
                        style={{ height: count > 0 ? `${Math.max(8, (count / max) * 100)}%` : "2px" }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-1.5 flex justify-between text-[9px] text-muted">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
          </div>
        </div>
      )}

      {tab === "week" && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">Esta semana</div>
              <div className="font-mono text-xl font-semibold text-txt">{weekTotal} rounds</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-card2 px-2.5 py-1">
              <span className="text-xs">🔥</span>
              <span className="font-mono text-[11px] font-semibold text-txt">{streak}</span>
              <span className="text-[10px] text-muted">{streak === 1 ? "dia" : "dias"}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3.5">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Rounds por dia
            </div>
            <div className="flex items-end gap-2 h-[140px]">
              {week.map((d, i) => {
                const max = Math.max(1, ...week.map((w) => w.rounds));
                const date = new Date(d.date + "T00:00:00");
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center justify-end h-full gap-1.5">
                    <span className="font-mono text-[10px] text-muted">{d.rounds || ""}</span>
                    <div
                      className="w-full rounded-t-md bg-primary/70"
                      style={{ height: d.rounds > 0 ? `${Math.max(6, (d.rounds / max) * 100)}%` : "2px" }}
                    />
                    <span className="text-[9px] text-muted">{DAYS_LABELS[(date.getDay() + 6) % 7]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-border bg-card p-3.5 text-center">
              <div className="font-mono text-2xl font-semibold text-txt">{lifetimeRounds}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">rounds no total</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3.5 text-center">
              <div className="font-mono text-2xl font-semibold text-txt">{lifetimeHours}h</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">foco acumulado</div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3.5">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Mapa de atividade — 12 semanas
            </div>
            <ActivityHeatmap dates={rounds.map((r) => r.completed_at)} weeksBack={12} />
          </div>
        </div>
      )}
    </div>
  );
}
