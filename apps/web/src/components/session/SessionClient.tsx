"use client";
// Active study session — timer, focus mode, checklist, AI coach, active recall
// Reference: StudyAI.jsx → screen==="session"
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useTimer } from "@/lib/hooks/useTimer";
import { Button } from "@/components/ui/Button";
import { Tip } from "@/components/ui/Tip";
import { EmptyState } from "@/components/shared/EmptyState";
import { Target } from "lucide-react";
import { sendToOrchestrator } from "@/lib/agents/orchestrator";
import { cn } from "@/lib/utils/cn";
import type { StudySession } from "@/types";

const CHECKLIST_ITEMS = ["Revisar anotações", "Praticar exercícios", "Active recall final"];

const CANNED_COACH_REPLIES = [
  "Você está indo bem — mantenha o foco até o fim do ciclo.",
  "Dica: tente explicar o conceito em voz alta, sem olhar o material.",
  "Faltam poucos minutos — aproveite para revisar os pontos que mais errou.",
  "Ótimo ritmo! Pequenas pausas ajudam a consolidar a memória.",
];

const QUICK_REPLIES = ["⏱ Quanto falta?", "🧠 Quiz rápido", "😓 Estou travado"];

// The active session's DB row id only lived in React state, so any reload — a Fast Refresh
// during dev, an accidental browser refresh, reopening the tab — lost the link to the row
// already created, and the mount effect below would create a *new* one instead of resuming,
// leaving an orphaned "started but never completed" row behind. Persisting the identifying
// triple here means a reload resumes the same DB row instead of duplicating it.
const ACTIVE_SESSION_KEY = "studyai:activeSession";

interface StoredActiveSession {
  sessionId: string;
  disciplineId: string;
  moduleId: string;
}

function readActiveSession(): StoredActiveSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredActiveSession) : null;
  } catch {
    return null;
  }
}

function writeActiveSession(data: StoredActiveSession) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode, storage full) — session still works,
    // it just won't survive a reload.
  }
}

function clearActiveSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // nothing to do
  }
}

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

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [checklist, setChecklist] = useState(
    CHECKLIST_ITEMS.map((label) => ({ label, done: false }))
  );

  const recallQuestions = buildRecallQuestions(moduleName, disciplineName);
  const [recallIdx, setRecallIdx] = useState(0);
  const [recallAnswer, setRecallAnswer] = useState("");
  const [recallNotes, setRecallNotes] = useState<string[]>([]);

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
        writeActiveSession({ sessionId: id, disciplineId, moduleId });
      } else {
        toast.error("Não foi possível registrar a sessão no servidor — vou tentar de novo ao concluir.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify when the timer runs out.
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
        timer.toggle();
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
  }, [timer.toggle, recallQuestions.length]);

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

  const handleVerifyRecall = () => {
    if (!recallAnswer.trim()) {
      toast.error("Escreva sua resposta primeiro.");
      return;
    }
    setRecallNotes((p) => [...p, recallAnswer.trim()]);
    toast.success("Registrado — continue praticando.");
    setTimeout(() => {
      setRecallIdx((p) => (p + 1) % recallQuestions.length);
      setRecallAnswer("");
    }, 600);
  };

  const handleNextRecall = () => {
    setRecallIdx((p) => (p + 1) % recallQuestions.length);
    setRecallAnswer("");
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

  const handleComplete = async () => {
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
          recallScore: 4,
          notes: recallNotes.join("\n\n") || recallAnswer.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to complete session");
      clearActiveSession();
      toast.success("Sessão concluída! Bom trabalho.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Não foi possível concluir a sessão.");
    } finally {
      setCompleting(false);
    }
  };

  const ringRadius = 58;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference * (1 - timer.progress);

  const focusRadius = 88;
  const focusCircumference = 2 * Math.PI * focusRadius;
  const focusDashOffset = focusCircumference * (1 - timer.progress);

  return (
    <div className="relative flex-1 overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
            Sessão ativa
          </div>
          <div className="font-serif text-lg font-semibold text-txt">
            {moduleName || disciplineName || "Sessão de estudo"}
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
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
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
                className={timer.running ? "drop-shadow-[0_0_8px_#3B82F6]" : ""}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-[42px] font-light leading-none text-txt">
                {timer.fmt(timer.seconds)}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
                {timer.running ? "foco" : "pausado"}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={timer.reset}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-border bg-card text-dim"
            >
              ↺
            </button>
            <button
              onClick={timer.toggle}
              className={cn(
                "flex h-[58px] w-[58px] items-center justify-center rounded-2xl text-2xl transition-all",
                timer.running ? "border border-danger bg-danger/15 text-danger" : "bg-primary text-bg"
              )}
            >
              {timer.running ? "⏸" : "▶"}
            </button>
            <button
              onClick={timer.skip}
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
            {disciplineName && (
              <div className="relative mb-2 inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary">
                {disciplineName}
              </div>
            )}
            <div className="relative mb-1 text-[15px] font-bold text-txt">
              {moduleName || "Sessão de estudo"}
            </div>
            <div className="relative mb-4 text-[11px] text-muted">
              {[methodology, duration ? `${durationMinutes} min` : null].filter(Boolean).join(" · ") ||
                "Sessão de estudo livre"}
            </div>
            <div className="relative mx-auto mb-4 h-[134px] w-[134px]">
              <svg width="134" height="134" className="-rotate-90">
                <circle cx="67" cy="67" r={ringRadius} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
                <defs>
                  <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
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
                  className={timer.running ? "drop-shadow-[0_0_5px_#3B82F6]" : ""}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono text-[28px] font-normal leading-none text-txt">
                  {timer.fmt(timer.seconds)}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-muted">
                  {timer.running ? "foco" : "pausado"}
                </div>
              </div>
            </div>
            <div className="relative mb-3 flex justify-center gap-2">
              <button
                onClick={timer.reset}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card2 text-dim"
              >
                ↺
              </button>
              <button
                onClick={timer.toggle}
                className={cn(
                  "flex h-[42px] w-[42px] items-center justify-center rounded-xl text-base transition-all",
                  timer.running ? "border border-danger bg-danger/15 text-danger" : "bg-primary text-bg"
                )}
              >
                {timer.running ? "⏸" : "▶"}
              </button>
              <button
                onClick={timer.skip}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card2 text-dim"
              >
                ⏭
              </button>
            </div>
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={completing}
              className="relative w-full justify-center disabled:opacity-60"
            >
              {completing ? "Concluindo…" : "✓ Concluir sessão"}
            </Button>
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
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary shadow-[0_0_5px_#8B5CF6]" />
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
              onChange={(e) => setRecallAnswer(e.target.value)}
              placeholder="Escreva sua resposta…"
              className="mb-2 min-h-[50px] w-full resize-none rounded-lg border border-border bg-card2 p-2 text-xs text-txt outline-none"
            />
            <div className="flex gap-1.5">
              <Button variant="primary" size="sm" onClick={handleVerifyRecall}>
                ✓ Verificar
              </Button>
              <Button size="sm" onClick={handleNextRecall}>
                → Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
