"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Discipline, Evaluation, Module, ModuleStatus } from "@/types";

export type NewDisciplineInput = Omit<Partial<Discipline>, "modules"> & {
  modules?: Array<{ name: string; estimated_hours?: number; topics?: string[] }>;
};

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
            ? { ...d, modules: (d.modules ?? []).map((m) => (m.id === moduleId ? { ...m, status } : m)) }
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
            ? { ...d, modules: (d.modules ?? []).map((m) => (m.id === moduleId ? { ...m, ...updates } : m)) }
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
          prev.map((d) => (d.id === disciplineId ? { ...d, modules: [...(d.modules ?? []), created] } : d))
        );
        router.refresh();
      } catch {
        toast.error("Erro ao adicionar módulo");
      }
    },
    [router]
  );

  const removeModule = useCallback(async (disciplineId: string, moduleId: string) => {
    setDisciplines((prev) =>
      prev.map((d) =>
        d.id === disciplineId ? { ...d, modules: (d.modules ?? []).filter((m) => m.id !== moduleId) } : d
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
    addEvaluation,
    removeEvaluation,
  };
}
