"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import type { DisciplineGroup } from "@/types";

export function useDisciplineGroups(initial: DisciplineGroup[]) {
  const [groups, setGroups] = useState<DisciplineGroup[]>(initial);

  const addGroup = useCallback(async (name: string) => {
    try {
      const res = await fetch("/api/discipline-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("request failed");
      const created: DisciplineGroup = await res.json();
      setGroups((prev) => [...prev, created]);
      return created;
    } catch {
      toast.error("Erro ao criar grupo");
      return null;
    }
  }, []);

  const renameGroup = useCallback(async (id: string, name: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
    try {
      const res = await fetch(`/api/discipline-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      toast.error("Erro ao renomear grupo");
    }
  }, []);

  // Returns the ids of disciplines that were in this group, so the caller can update its own
  // discipline state to group_id: null without waiting on a full page refetch.
  const removeGroup = useCallback(async (id: string) => {
    let removed: DisciplineGroup | undefined;
    setGroups((prev) => {
      removed = prev.find((g) => g.id === id);
      return prev.filter((g) => g.id !== id);
    });
    try {
      const res = await fetch(`/api/discipline-groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("request failed");
      toast.success("Grupo removido — matérias voltaram para 'Sem grupo'");
    } catch {
      toast.error("Erro ao remover grupo");
      setGroups((prev) => (removed && !prev.some((g) => g.id === id) ? [...prev, removed] : prev));
    }
  }, []);

  return { groups, addGroup, renameGroup, removeGroup };
}
