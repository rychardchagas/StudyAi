"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import type { Discipline, ModuleStatus } from "@/types";

export type NewDisciplineInput = Omit<Partial<Discipline>, "modules"> & {
  modules?: Array<{ name: string; estimated_hours?: number }>;
};

export function useDisciplines(initial: Discipline[]) {
  const [disciplines, setDisciplines] = useState<Discipline[]>(initial);

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
    } catch {
      toast.error("Erro ao adicionar matéria");
    }
  }, []);

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
    } catch {
      toast.error("Erro ao atualizar matéria");
    }
  }, []);

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
    } catch {
      toast.error("Erro ao remover matéria");
      setDisciplines((prev) => {
        if (!removed || prev.some((d) => d.id === id)) return prev;
        return [...prev, removed].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    }
  }, []);

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
      } catch {
        toast.error("Erro ao atualizar módulo");
      }
    },
    []
  );

  return { disciplines, addDiscipline, updateDiscipline, removeDiscipline, updateModuleStatus };
}
