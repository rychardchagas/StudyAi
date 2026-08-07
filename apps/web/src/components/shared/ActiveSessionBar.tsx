"use client";
// Mounted globally (see (app)/layout.tsx) so a session survives navigating away from /session —
// before this, leaving the page unmounted SessionClient entirely and the only way back was
// re-clicking the same calendar event; there was no way to resume *or* to mark it done from
// anywhere else in the app.
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { readActiveSession, clearActiveSession, type StoredActiveSession } from "@/lib/utils/activeSession";

export function ActiveSessionBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<StoredActiveSession | null>(null);
  const [completing, setCompleting] = useState(false);

  // No storage event fires in the tab that wrote the key, so re-check on every navigation —
  // that's what actually picks up a session just started (or just completed) in this same tab.
  useEffect(() => {
    setActive(readActiveSession());
  }, [pathname]);

  if (!active || pathname === "/session") return null;

  const resumeUrl = `/session?disciplineId=${active.disciplineId}&moduleId=${active.moduleId}&methodology=${encodeURIComponent(
    active.methodology
  )}&duration=${active.duration}&disciplineName=${encodeURIComponent(
    active.disciplineName
  )}&moduleName=${encodeURIComponent(active.moduleName)}`;

  async function handleQuickComplete() {
    if (!active || completing) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: active.sessionId,
          moduleId: active.moduleId || undefined,
          recallScore: 3,
        }),
      });
      if (!res.ok) throw new Error("failed");
      clearActiveSession();
      setActive(null);
      toast.success("Sessão concluída!");
      router.refresh();
    } catch {
      toast.error("Não foi possível concluir a sessão.");
    } finally {
      setCompleting(false);
    }
  }

  function handleDiscard() {
    clearActiveSession();
    setActive(null);
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-primary/25 bg-primary/[0.06] px-4 py-1.5">
      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse" />
      <span className="flex-1 truncate text-[11px] text-txt">
        Sessão em andamento — <strong className="font-semibold">{active.moduleName || active.disciplineName}</strong>
      </span>
      <button
        type="button"
        onClick={() => router.push(resumeUrl)}
        className="cursor-pointer rounded-md border border-primary/25 bg-primary/10 px-2 py-1 font-mono text-[10px] font-semibold text-primary hover:bg-primary/15"
      >
        Continuar
      </button>
      <button
        type="button"
        onClick={handleQuickComplete}
        disabled={completing}
        className="cursor-pointer rounded-md border border-success/25 bg-success/10 px-2 py-1 font-mono text-[10px] font-semibold text-success hover:bg-success/15 disabled:opacity-60"
      >
        ✓ Concluir
      </button>
      <button
        type="button"
        onClick={handleDiscard}
        title="Descartar sessão"
        className="cursor-pointer px-1 text-xs text-muted hover:text-txt"
      >
        ✕
      </button>
    </div>
  );
}
