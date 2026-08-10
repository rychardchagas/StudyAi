"use client";
// Active study session — timer, focus mode, checklist, AI coach, active recall
// Reference: StudyAI.jsx → screen==="session"
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useTimer } from "@/lib/hooks/useTimer";
import { usePomodoro } from "@/lib/hooks/usePomodoro";
import { usePomodoroConfig } from "@/lib/hooks/usePomodoroConfig";
import { useLofiAmbience } from "@/lib/hooks/useLofiAmbience";
import { parseSpotifyEmbedUrl } from "@/lib/utils/spotifyEmbed";
import { Button } from "@/components/ui/Button";
import { Tip } from "@/components/ui/Tip";
import { EmptyState } from "@/components/shared/EmptyState";
import { PomodoroSettingsPanel } from "@/components/shared/PomodoroSettingsPanel";
import { Target } from "lucide-react";
import { sendToOrchestrator } from "@/lib/agents/orchestrator";
import { cn } from "@/lib/utils/cn";
import { readActiveSession, writeActiveSession, clearActiveSession } from "@/lib/utils/activeSession";
import type { Rating } from "@/lib/utils/fsrs";
import type { StudySession } from "@/types";

const RECALL_RATINGS: Array<{ value: Rating; label: string; emoji: string }> = [
  { value: 1, label: "Esqueci", emoji: "😵" },
  { value: 2, label: "Difícil", emoji: "😓" },
  { value: 3, label: "Bom", emoji: "🙂" },
  { value: 4, label: "Fácil", emoji: "😄" },
];

const CHECKLIST_ITEMS = ["Revisar anotações", "Praticar exercícios", "Active recall final"];

const CANNED_COACH_REPLIES = [
  "Você está indo bem — mantenha o foco até o fim do ciclo.",
  "Dica: tente explicar o conceito em voz alta, sem olhar o material.",
  "Faltam poucos minutos — aproveite para revisar os pontos que mais errou.",
  "Ótimo ritmo! Pequenas pausas ajudam a consolidar a memória.",
];

const QUICK_REPLIES = ["⏱ Quanto falta?", "🧠 Quiz rápido", "😓 Estou travado"];

function buildRecallQuestions(moduleName: string, disciplineName: string) {
  const subject = moduleName || disciplineName || "este tema";
  return [
    `Explique em suas próprias palavras: ${subject}.`,
    `Quais são os pontos-chave de ${subject} que você lembra sem consultar o material?`,
    `Dê um exemplo prático de aplicação de ${subject}.`,
  ];
}

export function SessionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const disciplineId = searchParams.get("disciplineId") ?? "";
  const moduleId = searchParams.get("moduleId") ?? "";
  const methodology = searchParams.get("methodology") ?? "";
  const duration = searchParams.get("duration") ?? "";
  const disciplineName = searchParams.get("disciplineName") ?? "";
  const moduleName = searchParams.get("moduleName") ?? "";

  const durationMinutes = Number(duration) || 45;
  const initialSeconds = Number(duration) * 60 || 45 * 60;
  const timer = useTimer(initialSeconds);
  const { config: pomodoroConfig, saveConfig: savePomodoroConfig } = usePomodoroConfig();
  const pomodoro = usePomodoro(pomodoroConfig);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  // Timeboxing is a structural technique independent of which content methodology the session
  // uses (see Methodology in lib/agents/pedagogy.ts) — this lets the plain countdown and the
  // configurable work/break cycle share the same ring/controls in the JSX below instead of
  // duplicating it.
  const activeTimer = pomodoroMode
    ? {
        seconds: pomodoro.seconds,
        running: pomodoro.running,
        progress: pomodoro.progress,
        toggle: pomodoro.toggle,
        reset: pomodoro.reset,
        skip: pomodoro.skip,
        fmt: pomodoro.fmt,
        completed: false,
      }
    : timer;

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

  // Background music — lofi ambience (generated locally, no external file/stream) by default,
  // swappable for the student's own Spotify playlist. Configurable right here (not just in
  // Settings → Sessão) so it's a one-click edit without leaving the session, like a Notion widget.
  const lofi = useLofiAmbience();
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicSource, setMusicSource] = useState<"lofi" | "spotify">("lofi");
  const [spotifyRawUrl, setSpotifyRawUrl] = useState("");
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState<string | null>(null);
  const [editingSpotify, setEditingSpotify] = useState(false);
  const [spotifyInput, setSpotifyInput] = useState("");
  const [savingSpotify, setSavingSpotify] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const profile = await res.json();
        const raw = profile?.preferences?.pomodoro?.spotifyUrl;
        if (typeof raw === "string" && raw.trim()) {
          setSpotifyRawUrl(raw);
          setSpotifyEmbedUrl(parseSpotifyEmbedUrl(raw));
        }
      } catch {
        // no music panel change on failure — lofi source stays the default
      }
    })();
  }, []);

  async function handleSaveSpotifyUrl() {
    setSavingSpotify(true);
    try {
      const trimmed = spotifyInput.trim();
      // Read the current profile fresh right before writing — preferences is a shared blob (ai
      // provider config, notifications, availability, etc.) and `pomodoro` itself is shared too
      // (durations/auto-start live there via usePomodoroConfig) — spread the existing pomodoro
      // object too, or saving the link would silently wipe whatever timer config was already set.
      const current = await (await fetch("/api/profile")).json();
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            ...(current.preferences ?? {}),
            pomodoro: { ...(current.preferences?.pomodoro ?? {}), spotifyUrl: trimmed },
          },
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSpotifyRawUrl(trimmed);
      const embed = parseSpotifyEmbedUrl(trimmed);
      setSpotifyEmbedUrl(embed);
      setEditingSpotify(false);
      if (embed) {
        setMusicSource("spotify");
        toast.success("Playlist salva.");
      } else if (trimmed) {
        toast.error("Link salvo, mas não reconheci como um link do Spotify — confira e tente de novo.");
      } else {
        setMusicSource("lofi");
        toast.success("Playlist removida — voltando pro lofi.");
      }
    } catch {
      toast.error("Não foi possível salvar o link.");
    } finally {
      setSavingSpotify(false);
    }
  }
  useEffect(() => {
    if (pomodoroMode && activeTimer.running && musicEnabled && musicSource === "lofi") {
      lofi.start();
    } else {
      lofi.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroMode, activeTimer.running, musicEnabled, musicSource]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [checklist, setChecklist] = useState(
    CHECKLIST_ITEMS.map((label) => ({ label, done: false }))
  );

  // Starts with the generic template so the recall panel is never empty/blocked on network — if
  // this module has real ementa content (`topics`), a background fetch swaps in questions grounded
  // in that content instead. Silently keeps the generic ones on any failure (Ollama down, no
  // topics for this module, model error) rather than surfacing an error mid-session.
  const [recallQuestions, setRecallQuestions] = useState(() => buildRecallQuestions(moduleName, disciplineName));
  useEffect(() => {
    if (!moduleId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sessions/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId, moduleName, disciplineName }),
        });
        if (!res.ok) return;
        const data: { questions: string[] | null } = await res.json();
        if (!cancelled && data.questions?.length) setRecallQuestions(data.questions);
      } catch {
        // keep the generic fallback already in state
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const [recallIdx, setRecallIdx] = useState(0);
  const [recallAnswer, setRecallAnswer] = useState("");
  const [recallNotes, setRecallNotes] = useState<string[]>([]);
  const [grading, setGrading] = useState(false);
  const [recallVerdict, setRecallVerdict] = useState<{
    verdict: "correct" | "partial" | "incorrect";
    feedback: string;
  } | null>(null);
  // Default to "Bom" (3) rather than blocking completion on a forced choice — but this is a real,
  // changeable rating now, not the hardcoded 4 ("Fácil") this used to send unconditionally. It's
  // what feeds scheduleCard() in /api/sessions/complete, so it actually drives the module's next
  // review date instead of being a number nobody reads.
  const [recallRating, setRecallRating] = useState<Rating>(3);

  const [coachMessages, setCoachMessages] = useState<string[]>([
    "🧠 Sessão iniciada — feche o material e tente lembrar antes de checar.",
  ]);
  const [coachInput, setCoachInput] = useState("");
  const [coachBusy, setCoachBusy] = useState(false);
  const coachIdx = useRef(0);

  const createdRef = useRef(false);

  async function createSessionRow(): Promise<string | null> {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discipline_id: disciplineId,
          module_id: moduleId || undefined,
          scheduled_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
          methodology: methodology || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const created: StudySession = await res.json();
      return created.id;
    } catch {
      return null;
    }
  }

  // Create the DB row once, on mount, only when we arrived with real params — but first check
  // whether a reload just wiped React state for a session that's already persisted (see
  // ACTIVE_SESSION_KEY above) and resume that row instead of creating a duplicate.
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    if (!disciplineId) return;

    const resumable = readActiveSession();
    if (resumable && resumable.disciplineId === disciplineId && resumable.moduleId === moduleId) {
      setSessionId(resumable.sessionId);
      return;
    }

    (async () => {
      const id = await createSessionRow();
      if (id) {
        setSessionId(id);
        writeActiveSession({
          sessionId: id,
          disciplineId,
          moduleId,
          disciplineName,
          moduleName,
          methodology,
          duration,
        });
      } else {
        toast.error("Não foi possível registrar a sessão no servidor — vou tentar de novo ao concluir.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify when the plain countdown runs out (doesn't apply in Pomodoro mode, which has its own
  // work/break transition toasts above).
  useEffect(() => {
    if (timer.completed) {
      toast("Tempo esgotado! Revise seu progresso e conclua a sessão.", { icon: "⏰" });
    }
  }, [timer.completed]);

  // Keyboard shortcuts — Space play/pause, F focus mode, Esc exit, → next recall question.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // don't hijack browser shortcuts (e.g. Ctrl+F find)
      if (e.key === " ") {
        e.preventDefault();
        activeTimer.toggle();
      }
      if (e.key === "Escape") setFocusMode(false);
      if (e.key === "ArrowRight") {
        setRecallIdx((p) => (p + 1) % recallQuestions.length);
        setRecallAnswer("");
      }
      if (e.key === "f" || e.key === "F") setFocusMode((p) => !p);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimer.toggle, recallQuestions.length]);

  if (!disciplineId) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <EmptyState
          icon={Target}
          title="Nenhuma sessão selecionada"
          description="Escolha um evento no calendário para iniciar uma sessão de estudo guiada."
          cta="Ir para o calendário"
          onCta={() => router.push("/dashboard")}
        />
      </div>
    );
  }

  const toggleChecklistItem = (i: number) => {
    setChecklist((p) => p.map((it, j) => (j === i ? { ...it, done: !it.done } : it)));
  };
  const checkedCount = checklist.filter((c) => c.done).length;

  const handleVerifyRecall = async () => {
    if (!recallAnswer.trim() || grading) {
      if (!recallAnswer.trim()) toast.error("Escreva sua resposta primeiro.");
      return;
    }
    setRecallNotes((p) => [...p, recallAnswer.trim()]);
    setGrading(true);
    setRecallVerdict(null);
    try {
      const res = await fetch("/api/sessions/grade-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: recallQuestions[recallIdx],
          answer: recallAnswer.trim(),
          moduleName: moduleName || disciplineName,
        }),
      });
      if (!res.ok) throw new Error("grading unavailable");
      const verdict: { verdict: "correct" | "partial" | "incorrect"; feedback: string } = await res.json();
      setRecallVerdict(verdict);
    } catch {
      toast("Não foi possível avaliar agora — resposta registrada mesmo assim.", { icon: "⚠️" });
    } finally {
      setGrading(false);
    }
  };

  const handleNextRecall = () => {
    setRecallIdx((p) => (p + 1) % recallQuestions.length);
    setRecallAnswer("");
    setRecallVerdict(null);
  };

  const sendCoachMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || coachBusy) return;
    setCoachMessages((p) => [...p, `Você: ${trimmed}`]);
    setCoachInput("");
    setCoachBusy(true);
    try {
      const reply = await sendToOrchestrator([{ role: "user", content: trimmed }], {
        disciplines: disciplineName ? [{ name: disciplineName, horas: 0, prioridade: "Média" }] : [],
        weeklyAdherence: 0,
        streakDays: 0,
        pendingReviews: 0,
      });
      setCoachMessages((p) => [...p, reply.content]);
      reply.actionsPerformed.forEach((a) => toast.success(a));
    } catch {
      const fallback = CANNED_COACH_REPLIES[coachIdx.current % CANNED_COACH_REPLIES.length];
      coachIdx.current += 1;
      setCoachMessages((p) => [...p, fallback]);
    } finally {
      setCoachBusy(false);
    }
  };

  const handleComplete = async (finished: boolean = true) => {
    if (completing) return;
    setCompleting(true);
    try {
      const id = sessionId ?? (await createSessionRow());
      if (!id) {
        toast.error("Sessão encerrada, mas não foi possível salvar no histórico (sem conexão com o servidor).");
        router.push("/dashboard");
        return;
      }
      const res = await fetch("/api/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: id,
          moduleId: moduleId || undefined,
          // Not finished: no self-rating — they didn't do a real recall check, so scoring one
          // would be dishonest FSRS data. The module just gets flagged to come back next time
          // (see finished:false handling in /api/sessions/complete).
          recallScore: finished ? recallRating : undefined,
          notes: recallNotes.join("\n\n") || recallAnswer.trim() || undefined,
          finished,
        }),
      });
      if (!res.ok) throw new Error("Failed to complete session");
      clearActiveSession();
      toast.success(
        finished ? "Sessão concluída! Bom trabalho." : "Sem problemas — esse módulo volta pra você na próxima sessão."
      );
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar a sessão.");
    } finally {
      setCompleting(false);
    }
  };

  const timerLabel = pomodoroMode && pomodoro.phase !== "work" ? "pausa" : activeTimer.running ? "foco" : "pausado";

  const ringRadius = 58;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference * (1 - activeTimer.progress);

  const focusRadius = 88;
  const focusCircumference = 2 * Math.PI * focusRadius;
  const focusDashOffset = focusCircumference * (1 - activeTimer.progress);

  return (
    <div className="relative flex-1 overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
            Sessão ativa
          </div>
          <div className="font-serif text-lg font-semibold text-txt">
            {disciplineName || moduleName || "Sessão de estudo"}
          </div>
        </div>
        <div className="flex gap-2">
          <Tip label="Modo foco (tecla F)">
            <button
              onClick={() => setFocusMode(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-dim"
            >
              ⛶
            </button>
          </Tip>
          <Button size="sm" onClick={() => router.push("/dashboard")}>
            ← Calendário
          </Button>
        </div>
      </div>

      {focusMode && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-bg">
          <button
            onClick={() => setFocusMode(false)}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-dim"
          >
            ✕
          </button>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            {disciplineName || "Foco"}
            {moduleName ? ` — ${moduleName}` : ""}
          </div>
          <div className="relative h-[200px] w-[200px]">
            <svg width="200" height="200" className="-rotate-90">
              <circle cx="100" cy="100" r={focusRadius} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="7" />
              <defs>
                <linearGradient id="focus-ring" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="oklch(var(--primary))" />
                  <stop offset="100%" stopColor="oklch(var(--secondary))" />
                </linearGradient>
              </defs>
              <circle
                cx="100"
                cy="100"
                r={focusRadius}
                fill="none"
                stroke="url(#focus-ring)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={focusCircumference}
                strokeDashoffset={focusDashOffset}
                style={{ transition: "stroke-dashoffset .5s ease" }}
                className={activeTimer.running ? "drop-shadow-[0_0_8px_oklch(var(--primary))]" : ""}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-[42px] font-light leading-none text-txt">
                {activeTimer.fmt(activeTimer.seconds)}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
                {timerLabel}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={activeTimer.reset}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-border bg-card text-dim"
            >
              ↺
            </button>
            <button
              onClick={activeTimer.toggle}
              className={cn(
                "flex h-[58px] w-[58px] items-center justify-center rounded-2xl text-2xl transition-all",
                activeTimer.running ? "border border-danger bg-danger/15 text-danger" : "bg-primary text-bg"
              )}
            >
              {activeTimer.running ? "⏸" : "▶"}
            </button>
            <button
              onClick={activeTimer.skip}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-border bg-card text-dim"
            >
              ⏭
            </button>
          </div>
          <div className="font-mono text-[11px] text-muted">
            Space = play/pause · → = próxima pergunta · Esc = sair
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_295px]">
        <div>
          {/* Timer card */}
          <div className="relative mb-3 overflow-hidden rounded-xl border border-border bg-card p-4 text-center">
            <div className="pointer-events-none absolute -top-10 left-1/2 h-[130px] w-[260px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(59,130,246,.08)_0%,transparent_70%)]" />
            {/* Discipline is the headline (full name, wraps instead of clipping — this used to be
                a one-line uppercase badge that silently cut long names, e.g. "Segurança da
                Informação" → "Segurança da"), module underneath as the subtitle. */}
            <div className="relative mb-1 text-[15px] font-bold text-txt leading-snug">
              {disciplineName || "Sessão de estudo"}
            </div>
            {moduleName && (
              <div className="relative mb-1 text-[12px] font-medium text-dim leading-snug">{moduleName}</div>
            )}
            <div className="relative mb-4 text-[11px] text-muted">
              {[methodology, duration ? `${durationMinutes} min` : null].filter(Boolean).join(" · ") ||
                "Sessão de estudo livre"}
            </div>
            <div className="relative mx-auto mb-4 h-[134px] w-[134px]">
              <svg width="134" height="134" className="-rotate-90">
                <circle cx="67" cy="67" r={ringRadius} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
                <defs>
                  <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="oklch(var(--primary))" />
                    <stop offset="100%" stopColor="oklch(var(--secondary))" />
                  </linearGradient>
                </defs>
                <circle
                  cx="67"
                  cy="67"
                  r={ringRadius}
                  fill="none"
                  stroke="url(#ring-grad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset .5s ease" }}
                  className={activeTimer.running ? "drop-shadow-[0_0_5px_oklch(var(--primary))]" : ""}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono text-[28px] font-normal leading-none text-txt">
                  {activeTimer.fmt(activeTimer.seconds)}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-muted">
                  {timerLabel}
                </div>
              </div>
            </div>
            <div className="relative mb-3 flex justify-center gap-2">
              <button
                onClick={activeTimer.reset}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card2 text-dim"
              >
                ↺
              </button>
              <button
                onClick={activeTimer.toggle}
                className={cn(
                  "flex h-[42px] w-[42px] items-center justify-center rounded-xl text-base transition-all",
                  activeTimer.running ? "border border-danger bg-danger/15 text-danger" : "bg-primary text-bg"
                )}
              >
                {activeTimer.running ? "⏸" : "▶"}
              </button>
              <button
                onClick={activeTimer.skip}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card2 text-dim"
              >
                ⏭
              </button>
            </div>
            <div className="relative mb-2.5 flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (!pomodoroMode) pomodoro.reset();
                  setPomodoroMode((p) => !p);
                }}
                title="Blocos de 25min de foco com 5min de pausa — técnica de timeboxing, complementa a metodologia da sessão"
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors cursor-pointer",
                  pomodoroMode ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card2 text-dim hover:text-txt"
                )}
              >
                🍅 Modo Pomodoro {pomodoroMode ? "ativo" : ""}
              </button>
              {pomodoroMode && pomodoro.cyclesCompleted > 0 && (
                <span className="font-mono text-[10px] text-muted">
                  {pomodoro.cyclesCompleted} {pomodoro.cyclesCompleted === 1 ? "ciclo" : "ciclos"}
                </span>
              )}
              {pomodoroMode && (
                <button
                  type="button"
                  onClick={() => setShowPomodoroSettings((v) => !v)}
                  title="Configurar durações do Pomodoro"
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card2 text-[10px] text-dim hover:text-txt"
                >
                  ⚙️
                </button>
              )}
            </div>

            {pomodoroMode && showPomodoroSettings && (
              <div className="relative mb-2.5">
                <PomodoroSettingsPanel
                  config={pomodoroConfig}
                  onSave={savePomodoroConfig}
                  onClose={() => setShowPomodoroSettings(false)}
                />
              </div>
            )}

            <div className="relative mb-2.5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Como foi lembrar disso?
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {RECALL_RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRecallRating(r.value)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border py-1.5 text-[10px] transition-colors",
                      recallRating === r.value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card2 text-dim"
                    )}
                  >
                    <span className="text-sm">{r.emoji}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => handleComplete(true)}
              disabled={completing}
              className="relative w-full justify-center disabled:opacity-60"
            >
              {completing ? "Salvando…" : "✓ Concluir sessão"}
            </Button>
            <button
              type="button"
              onClick={() => handleComplete(false)}
              disabled={completing}
              title="Marca o módulo pra voltar na próxima sessão, sem contar como recall avaliado"
              className="relative mt-1.5 w-full rounded-lg border border-border bg-transparent py-1.5 text-[11px] text-muted cursor-pointer hover:text-dim disabled:opacity-60"
            >
              ↺ Não terminei — retomar depois
            </button>
          </div>

          {/* Checklist */}
          <div className="rounded-xl border border-border bg-card p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-txt">Checklist</span>
              <span className="font-mono text-[11px] text-success">
                {checkedCount}/{checklist.length}
              </span>
            </div>
            {checklist.map((item, i) => (
              <div
                key={item.label}
                onClick={() => toggleChecklistItem(i)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5"
              >
                <div
                  className={cn(
                    "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border text-[8px] text-bg",
                    item.done ? "border-success bg-success" : "border-border2 bg-transparent"
                  )}
                >
                  {item.done && "✓"}
                </div>
                <span className={cn("text-xs", item.done ? "text-muted line-through" : "text-dim")}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* AI Coach */}
          <div className="mb-2.5 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary shadow-[0_0_5px_oklch(var(--secondary))]" />
              <span className="text-xs font-semibold text-txt">Agente de Estudo</span>
            </div>
            <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto p-2.5">
              {coachMessages.map((m, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card2 px-2 py-1.5 text-[11px] leading-relaxed text-txt"
                >
                  {m}
                </div>
              ))}
              {coachBusy && (
                <div className="rounded-lg border border-border bg-card2 px-2 py-1.5 text-[11px] leading-relaxed text-muted">
                  Digitando…
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
              {QUICK_REPLIES.map((c) => (
                <button
                  key={c}
                  onClick={() => sendCoachMessage(c)}
                  className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted"
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-1 border-t border-border px-2.5 py-1.5">
              <input
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCoachMessage(coachInput)}
                placeholder="Dúvida ou resposta…"
                className="flex-1 bg-transparent text-[11px] text-txt outline-none"
              />
              <button
                onClick={() => sendCoachMessage(coachInput)}
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-secondary text-[10px] text-bg"
              >
                ↑
              </button>
            </div>
          </div>

          {/* Active Recall */}
          <div className="rounded-xl border border-border bg-card p-3.5">
            <div className="mb-2 text-xs font-semibold text-txt">🧠 Active Recall</div>
            <div className="mb-2 rounded-lg border border-border bg-card2 px-2.5 py-1.5 text-xs leading-relaxed text-txt">
              {recallQuestions[recallIdx]}
            </div>
            <textarea
              value={recallAnswer}
              onChange={(e) => {
                setRecallAnswer(e.target.value);
                setRecallVerdict(null);
              }}
              placeholder="Escreva sua resposta…"
              className="mb-2 min-h-[50px] w-full resize-none rounded-lg border border-border bg-card2 p-2 text-xs text-txt outline-none"
            />
            {recallVerdict && (
              <div
                className={cn(
                  "mb-2 rounded-lg border px-2.5 py-1.5 text-xs leading-relaxed",
                  recallVerdict.verdict === "correct" && "border-success/30 bg-success/10 text-success",
                  recallVerdict.verdict === "partial" && "border-warning/30 bg-warning/10 text-warning",
                  recallVerdict.verdict === "incorrect" && "border-danger/30 bg-danger/10 text-danger"
                )}
              >
                {recallVerdict.verdict === "correct" && "✓ Correto — "}
                {recallVerdict.verdict === "partial" && "OK — "}
                {recallVerdict.verdict === "incorrect" && "✗ Incorreto — "}
                <span className="text-txt">{recallVerdict.feedback}</span>
              </div>
            )}
            <div className="flex gap-1.5">
              <Button variant="primary" size="sm" onClick={handleVerifyRecall} disabled={grading}>
                {grading ? "Avaliando…" : "✓ Verificar"}
              </Button>
              <Button size="sm" onClick={handleNextRecall}>
                → Próxima
              </Button>
            </div>
          </div>

          {/* Música — lofi local por padrão, playlist do Spotify se configurada. Só aparece com
              o Modo Pomodoro ativo (mesma condição de antes, só mudou de coluna). */}
          {pomodoroMode && (
            <div className="mt-2.5 rounded-xl border border-border bg-card p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {spotifyEmbedUrl && (
                    <div className="flex overflow-hidden rounded-md border border-border">
                      <button
                        type="button"
                        onClick={() => setMusicSource("lofi")}
                        className={cn(
                          "px-2 py-0.5 font-mono text-[10px]",
                          musicSource === "lofi" ? "bg-primary/15 text-primary" : "bg-transparent text-dim"
                        )}
                      >
                        🎵 Lofi
                      </button>
                      <button
                        type="button"
                        onClick={() => setMusicSource("spotify")}
                        className={cn(
                          "px-2 py-0.5 font-mono text-[10px]",
                          musicSource === "spotify" ? "bg-primary/15 text-primary" : "bg-transparent text-dim"
                        )}
                      >
                        🎧 Spotify
                      </button>
                    </div>
                  )}
                  {!spotifyEmbedUrl && <span className="font-mono text-[10px] text-dim">🎵 Lofi ambiente</span>}
                </div>
                <div className="flex items-center gap-2">
                  {!editingSpotify && (
                    <button
                      type="button"
                      onClick={() => {
                        setSpotifyInput(spotifyRawUrl);
                        setEditingSpotify(true);
                      }}
                      title={spotifyEmbedUrl ? "Editar link do Spotify" : "Usar playlist do Spotify"}
                      className="font-mono text-[10px] text-dim hover:text-txt"
                    >
                      {spotifyEmbedUrl ? "✏️" : "+ Spotify"}
                    </button>
                  )}
                  {!editingSpotify && musicSource === "lofi" && (
                    <button
                      type="button"
                      onClick={() => setMusicEnabled((v) => !v)}
                      title={musicEnabled ? "Desligar música" : "Ligar música"}
                      className="font-mono text-[10px] text-dim hover:text-txt"
                    >
                      {musicEnabled ? "🔊" : "🔇"}
                    </button>
                  )}
                </div>
              </div>

              {editingSpotify ? (
                <div>
                  <div className="flex gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={spotifyInput}
                      onChange={(e) => setSpotifyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveSpotifyUrl();
                        if (e.key === "Escape") setEditingSpotify(false);
                      }}
                      placeholder="https://open.spotify.com/playlist/..."
                      className="min-w-0 flex-1 rounded-md border border-border bg-card2 px-2 py-1 font-mono text-[10px] text-txt outline-none focus:border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSpotifyUrl}
                      disabled={savingSpotify}
                      className="rounded-md bg-primary px-2 py-1 font-mono text-[10px] font-semibold text-bg"
                    >
                      {savingSpotify ? "..." : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSpotify(false)}
                      className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-dim"
                    >
                      Cancelar
                    </button>
                  </div>
                  {spotifyInput.trim() && (
                    <p className={`mt-1 text-[10px] ${parseSpotifyEmbedUrl(spotifyInput) ? "text-success" : "text-danger"}`}>
                      {parseSpotifyEmbedUrl(spotifyInput) ? "✓ Link válido" : "✗ Não reconheci como link do Spotify"}
                    </p>
                  )}
                </div>
              ) : musicSource === "lofi" ? (
                <>
                  {musicEnabled && (
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={0.3}
                      onChange={(e) => lofi.setVolume(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  )}
                  <p className="text-[10px] text-muted">
                    Ambiente sonoro gerado localmente — toca enquanto o timer de foco/pausa estiver
                    rodando.
                  </p>
                </>
              ) : (
                <>
                  <iframe
                    title="Player do Spotify"
                    src={spotifyEmbedUrl ?? undefined}
                    width="100%"
                    height="152"
                    style={{ borderRadius: 8, border: "none" }}
                    allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                  <p className="mt-1 text-[10px] text-muted">
                    Pode ser preciso apertar play uma vez aqui dentro — o navegador nem sempre
                    libera autoplay para o player embutido.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
