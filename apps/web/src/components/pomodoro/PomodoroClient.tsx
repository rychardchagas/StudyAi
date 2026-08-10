"use client";
// Standalone Pomodoro — same timer engine as the study session's Pomodoro mode
// (lib/hooks/usePomodoro), but with no discipline/module tied to it. For any general-purpose
// focus block: reading, chores, work outside of StudyAI's own study flow.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePomodoro } from "@/lib/hooks/usePomodoro";
import { usePomodoroConfig } from "@/lib/hooks/usePomodoroConfig";
import { useLofiAmbience } from "@/lib/hooks/useLofiAmbience";
import { PomodoroSettingsPanel } from "@/components/shared/PomodoroSettingsPanel";
import { cn } from "@/lib/utils/cn";

const PHASE_LABEL: Record<string, string> = {
  work: "Foco",
  "short-break": "Pausa curta",
  "long-break": "Pausa longa",
};

export function PomodoroClient() {
  const { config, saveConfig } = usePomodoroConfig();
  const pomodoro = usePomodoro(config);
  const [showSettings, setShowSettings] = useState(false);
  const lofi = useLofiAmbience();
  const [musicOn, setMusicOn] = useState(false);

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

  useEffect(() => {
    if (musicOn && pomodoro.running) lofi.start();
    else lofi.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicOn, pomodoro.running]);

  // Keyboard shortcut, matching the session screen's convention.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        pomodoro.toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.toggle]);

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pomodoro.progress);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-5">
        <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
          Foco
        </div>
        <div className="font-serif text-lg font-semibold text-txt">Pomodoro</div>
        <p className="mt-1 text-xs text-dim">
          Timer independente de qualquer matéria — use pra qualquer bloco de foco, dentro ou fora
          do StudyAI.
        </p>
      </div>

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
              onClick={() => setMusicOn((v) => !v)}
              title="Ambiente sonoro lofi (gerado localmente)"
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors cursor-pointer",
                musicOn ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card2 text-dim hover:text-txt"
              )}
            >
              🎵 Lofi {musicOn ? "ligado" : ""}
            </button>
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
      </div>
    </div>
  );
}
