"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Discipline, Evaluation, Module, ModuleStatus } from "@/types";

export type NewDisciplineInput = Omit<Partial<Discipline>, "modules"> & {
  modules?: Array<{ name: string; estimated_hours?: number; topics?: string[] }>;
};

// Mirrors recalculateAllProgress()'s formula in local-db.ts exactly. The server already
// recalculates disciplines.progress on every module status/create/delete — but this hook keeps
// its own client-side copy of `disciplines` in useState(initial), which (a) never re-syncs from
// a changed `initial` prop after mount, React doesn't do that automatically, and (b) never
// touched `.progress` on its own optimistic updates below. Net effect: the card's own "X%
// concluído" badge sat stale until a full page reload, even though the number stored in SQLite
// was already correct — the fix is computing it here too, not just on the server.
function withRecalculatedProgress(d: Discipline): Discipline {
  const modules = d.modules ?? [];
  if (!modules.length) return d;
  const doneCount = modules.filter((m) => m.status === "done").length;
  const progress = Math.round((doneCount / modules.length) * 100);
  return progress === d.progress ? d : { ...d, progress };
}

export function useDisciplines(initial: Discipline[]) {
  const router = useRouter();
  const [disciplines, setDisciplines] = useState<Discipline[]>(initial);

  // This screen has no calendar state of its own (unlike useCalendar on the Dashboard), so
  // editing hours/priority/exam date/modules here used to leave the Dashboard's calendar stale
  // until the user happened to click "Replanejar" — nothing told Next.js the disciplines data
  // had changed. router.refresh() busts the cached server-rendered props for the next navigation,
  // so the Dashboard's useCalendar mounts with fresh data (and its local generator, at least,
  // picks up the change) instead of silently serving last-visit numbers.
  const addDiscipline = useCallback(async (input: NewDisciplineInput) => {
    try {
      const res = await fetch("/api/disciplines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("request failed");
      const created: Discipline = await res.json();
      setDisciplines((prev) => [...prev, { ...created, modules: created.modules ?? [] }]);
      toast.success("Matéria adicionada");
      router.refresh();
    } catch {
      toast.error("Erro ao adicionar matéria");
    }
  }, [router]);

  const updateDiscipline = useCallback(async (id: string, updates: Partial<Discipline>) => {
    setDisciplines((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    try {
      const res = await fetch(`/api/disciplines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("request failed");
      const updated: Discipline = await res.json();
      setDisciplines((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updated, modules: d.modules } : d))
      );
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar matéria");
    }
  }, [router]);

  const removeDiscipline = useCallback(async (id: string) => {
    let removed: Discipline | undefined;
    setDisciplines((prev) => {
      removed = prev.find((d) => d.id === id);
      return prev.filter((d) => d.id !== id);
    });
    try {
      const res = await fetch(`/api/disciplines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("request failed");
      toast.success("Matéria removida");
      router.refresh();
    } catch {
      toast.error("Erro ao remover matéria");
      setDisciplines((prev) => {
        if (!removed || prev.some((d) => d.id === id)) return prev;
        return [...prev, removed].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    }
  }, [router]);

  const updateModuleStatus = useCallback(
    async (disciplineId: string, moduleId: string, status: ModuleStatus) => {
      setDisciplines((prev) =>
        prev.map((d) =>
          d.id === disciplineId
            ? withRecalculatedProgress({
                ...d,
                modules: (d.modules ?? []).map((m) => (m.id === moduleId ? { ...m, status } : m)),
              })
            : d
        )
      );
      try {
        const res = await fetch(`/api/modules/${moduleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("request failed");
        router.refresh();
      } catch {
        toast.error("Erro ao atualizar módulo");
      }
    },
    [router]
  );

  const updateModule = useCallback(
    async (disciplineId: string, moduleId: string, updates: Partial<Module>) => {
      setDisciplines((prev) =>
        prev.map((d) =>
          d.id === disciplineId
            ? withRecalculatedProgress({
                ...d,
                modules: (d.modules ?? []).map((m) => (m.id === moduleId ? { ...m, ...updates } : m)),
              })
            : d
        )
      );
      try {
        const res = await fetch(`/api/modules/${moduleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error("request failed");
        router.refresh();
      } catch {
        toast.error("Erro ao atualizar módulo");
      }
    },
    [router]
  );

  const addModule = useCallback(
    async (disciplineId: string, input: { name: string; estimated_hours?: number }) => {
      try {
        const res = await fetch("/api/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discipline_id: disciplineId, ...input }),
        });
        if (!res.ok) throw new Error("request failed");
        const created: Module = await res.json();
        setDisciplines((prev) =>
          prev.map((d) =>
            d.id === disciplineId ? withRecalculatedProgress({ ...d, modules: [...(d.modules ?? []), created] }) : d
          )
        );
        router.refresh();
      } catch {
        toast.error("Erro ao adicionar módulo");
      }
    },
    [router]
  );

  // Optimistic reorder — the list/Kanban view already reflects the new order before the network
  // round-trip finishes, and reorderModules() on the server rewrites order_index for the whole
  // discipline in one go (see local-db.ts) rather than one PATCH per moved module.
  const reorderModules = useCallback(async (disciplineId: string, orderedModuleIds: string[]) => {
    setDisciplines((prev) =>
      prev.map((d) => {
        if (d.id !== disciplineId) return d;
        const byId = new Map((d.modules ?? []).map((m) => [m.id, m]));
        const reordered = orderedModuleIds.map((id) => byId.get(id)).filter((m): m is Module => !!m);
        return { ...d, modules: reordered };
      })
    );
    try {
      const res = await fetch("/api/modules/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline_id: disciplineId, module_ids: orderedModuleIds }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      toast.error("Não foi possível salvar a nova ordem — tente de novo.");
    }
  }, []);

  const removeModule = useCallback(async (disciplineId: string, moduleId: string) => {
    setDisciplines((prev) =>
      prev.map((d) =>
        d.id === disciplineId
          ? withRecalculatedProgress({ ...d, modules: (d.modules ?? []).filter((m) => m.id !== moduleId) })
          : d
      )
    );
    try {
      const res = await fetch(`/api/modules/${moduleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("request failed");
      router.refresh();
    } catch {
      toast.error("Erro ao remover módulo");
    }
  }, [router]);

  const addEvaluation = useCallback(
    async (disciplineId: string, input: { name: string; date: string; weight?: number | null }) => {
      try {
        const res = await fetch("/api/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discipline_id: disciplineId, ...input }),
        });
        if (!res.ok) throw new Error("request failed");
        const created: Evaluation = await res.json();
        setDisciplines((prev) =>
          prev.map((d) => (d.id === disciplineId ? { ...d, evaluations: [...(d.evaluations ?? []), created] } : d))
        );
        router.refresh();
      } catch {
        toast.error("Erro ao adicionar avaliação");
      }
    },
    [router]
  );

  const removeEvaluation = useCallback(async (disciplineId: string, evaluationId: string) => {
    setDisciplines((prev) =>
      prev.map((d) =>
        d.id === disciplineId
          ? { ...d, evaluations: (d.evaluations ?? []).filter((e) => e.id !== evaluationId) }
          : d
      )
    );
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("request failed");
      router.refresh();
    } catch {
      toast.error("Erro ao remover avaliação");
    }
  }, [router]);

  return {
    disciplines,
    addDiscipline,
    updateDiscipline,
    removeDiscipline,
    updateModuleStatus,
    updateModule,
    addModule,
    removeModule,
    reorderModules,
    addEvaluation,
    removeEvaluation,
  };
}
