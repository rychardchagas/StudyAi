"use client";
// Disciplines management — uses useDisciplines hook
// Reference: apps/web/src/app/prototype/StudyAI.jsx → screen==="disciplines" (~L825-884)

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { Tip } from "@/components/ui/Tip";
import { EmptyState } from "@/components/shared/EmptyState";
import { BookOpen, FolderPlus, Folder, X } from "lucide-react";
import { useDisciplines } from "@/lib/hooks/useDisciplines";
import { useDisciplineGroups } from "@/lib/hooks/useDisciplineGroups";
import { calcETA } from "@/lib/utils/fsrs";
import { nearestEvaluationDate } from "@/lib/utils/evaluations";
import { DAYS_LABELS, SLOT_LABELS } from "@/lib/utils/constants";
import type { ParsedModule } from "@/lib/agents/curriculum";
import { selectMethodology } from "@/lib/agents/pedagogy";
import type { Discipline, DisciplineGroup, FixedSlot, Module, ModuleStatus, Priority } from "@/types";

const DISC_COLORS = [
  "#3B82F6", "#8B5CF6", "#22C55E", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#14B8A6", "#6366F1",
];

const PRIORITIES: Priority[] = ["Alta", "Média", "Baixa"];
const UNGROUPED = "__ungrouped__";

function daysUntil(examDate: string | null): number | null {
  if (!examDate) return null;
  return Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000));
}

// Same "which module should this session cover" preference as the Scheduler agent's
// pickModuleForSession, minus the review-rotation logic (there's no session count here —
// this is a one-off manual "study this now" click, not a generated calendar slot).
function pickStudyModule(modules: Module[]): Module | undefined {
  return modules.find((m) => m.status === "prog") ?? modules.find((m) => m.status === "pend") ?? modules[0];
}

function buildSessionHref(d: Discipline, modules: Module[]): string {
  const mod = pickStudyModule(modules);
  const methodology = selectMethodology(mod?.status ?? "pend", daysUntil(nearestEvaluationDate(d)), 0);
  const params = new URLSearchParams({
    disciplineId: d.id,
    moduleId: mod?.id ?? "",
    methodology,
    duration: "45",
    disciplineName: d.name,
    moduleName: mod?.name ?? d.name,
  });
  return `/session?${params.toString()}`;
}

// Reimplementation of the prototype's urgencyBorder() (~L229-235) as Tailwind classes.
function urgencyBorderClass(examDate: string | null): string {
  const days = daysUntil(examDate);
  if (days === null) return "border-border";
  if (days <= 3) return "border-danger/60 shadow-[0_0_8px_rgba(239,68,68,0.25)]";
  if (days <= 7) return "border-warning/50 shadow-[0_0_6px_rgba(245,158,11,0.2)]";
  return "border-border";
}

function nextModuleStatus(status: ModuleStatus): ModuleStatus {
  if (status === "pend") return "prog";
  if (status === "prog") return "done";
  return "pend";
}

function moduleStatusLabel(status: ModuleStatus): string {
  if (status === "done") return "✓ feito";
  if (status === "prog") return "→ em curso";
  return "pendente";
}

function moduleStatusClasses(status: ModuleStatus): string {
  if (status === "done") return "bg-success/15 text-success";
  if (status === "prog") return "bg-primary/15 text-primary";
  return "bg-card2 text-muted";
}

interface NewDisciplineForm {
  name: string;
  horas_semana: number;
  prioridade: Priority;
  exam_date: string;
}

const emptyForm: NewDisciplineForm = { name: "", horas_semana: 4, prioridade: "Média", exam_date: "" };

interface EditDisciplineForm {
  horas_semana: number;
  prioridade: Priority;
  exam_date: string;
  group_id: string | null;
}

interface NewModuleForm {
  name: string;
  estimated_hours: number;
}

const emptyModuleForm: NewModuleForm = { name: "", estimated_hours: 3 };

export function DisciplinesClient({
  initialDisciplines,
  initialGroups,
}: {
  initialDisciplines: Discipline[];
  initialGroups: DisciplineGroup[];
}) {
  const {
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
  } = useDisciplines(initialDisciplines);
  const { groups, addGroup, renameGroup, removeGroup } = useDisciplineGroups(initialGroups);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewDisciplineForm>(emptyForm);
  const [parsedModules, setParsedModules] = useState<ParsedModule[]>([]);
  const [parsing, setParsing] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditDisciplineForm | null>(null);
  const [newModuleForm, setNewModuleForm] = useState<NewModuleForm>(emptyModuleForm);
  const [newFixedSlot, setNewFixedSlot] = useState<FixedSlot>({ dayOfWeek: 0, slotIndex: 13 });
  const [newEvaluationForm, setNewEvaluationForm] = useState({ name: "", date: "", weight: "" });

  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  function startEditing(d: Discipline) {
    setEditingId(d.id);
    setEditForm({
      horas_semana: d.horas_semana,
      prioridade: d.prioridade,
      exam_date: d.exam_date ?? "",
      group_id: d.group_id ?? null,
    });
    setNewModuleForm(emptyModuleForm);
    setNewFixedSlot({ dayOfWeek: 0, slotIndex: 13 });
    setNewEvaluationForm({ name: "", date: "", weight: "" });
  }

  async function handleAddEvaluation(disciplineId: string) {
    if (!newEvaluationForm.name.trim() || !newEvaluationForm.date) {
      toast.error("Preencha nome e data da avaliação.");
      return;
    }
    await addEvaluation(disciplineId, {
      name: newEvaluationForm.name.trim(),
      date: newEvaluationForm.date,
      weight: newEvaluationForm.weight ? Number(newEvaluationForm.weight) : null,
    });
    setNewEvaluationForm({ name: "", date: "", weight: "" });
  }

  async function handleAddFixedSlot(d: Discipline) {
    const exists = (d.fixed_schedule ?? []).some(
      (s) => s.dayOfWeek === newFixedSlot.dayOfWeek && s.slotIndex === newFixedSlot.slotIndex
    );
    if (exists) {
      toast.error("Esse horário já está fixado nessa matéria.");
      return;
    }
    await updateDiscipline(d.id, { fixed_schedule: [...(d.fixed_schedule ?? []), newFixedSlot] });
  }

  async function handleRemoveFixedSlot(d: Discipline, slot: FixedSlot) {
    await updateDiscipline(d.id, {
      fixed_schedule: (d.fixed_schedule ?? []).filter(
        (s) => !(s.dayOfWeek === slot.dayOfWeek && s.slotIndex === slot.slotIndex)
      ),
    });
  }

  function stopEditing() {
    setEditingId(null);
    setEditForm(null);
  }

  async function handleSaveEdit(disciplineId: string) {
    if (!editForm) return;
    await updateDiscipline(disciplineId, {
      horas_semana: editForm.horas_semana,
      prioridade: editForm.prioridade,
      exam_date: editForm.exam_date || null,
      group_id: editForm.group_id,
    });
    stopEditing();
  }

  async function handleAddModule(disciplineId: string) {
    if (!newModuleForm.name.trim()) return;
    await addModule(disciplineId, { name: newModuleForm.name.trim(), estimated_hours: newModuleForm.estimated_hours });
    setNewModuleForm(emptyModuleForm);
  }

  async function handleFileUpload(file: File) {
    if (!form.name.trim()) {
      toast.error("Preencha o nome da matéria antes de importar o arquivo.");
      return;
    }
    setParsing(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("disciplineName", form.name.trim());
      const res = await fetch("/api/curriculum/parse", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Falha ao processar o arquivo");
      setParsedModules(data.modules ?? []);
      toast.success(`${(data.modules ?? []).length} módulos extraídos do arquivo.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao processar o arquivo");
    } finally {
      setParsing(false);
    }
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    const color = DISC_COLORS[disciplines.length % DISC_COLORS.length];
    await addDiscipline({
      name: form.name.trim(),
      type: "Graduação",
      color,
      horas_semana: form.horas_semana,
      prioridade: form.prioridade,
      exam_date: form.exam_date || null,
      progress: 0,
      modules: parsedModules.map((m) => ({ name: m.name, estimated_hours: m.estimatedHours, topics: m.topics })),
    });
    setForm(emptyForm);
    setParsedModules([]);
    setShowForm(false);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    await addGroup(newGroupName.trim());
    setNewGroupName("");
    setAddingGroup(false);
  }

  async function handleDeleteGroup(g: DisciplineGroup) {
    if (!window.confirm(`Remover o grupo "${g.name}"? As matérias dele voltam para "Sem grupo" — nada é apagado.`)) return;
    await removeGroup(g.id);
  }

  const grouped = useMemo(() => {
    const byGroup = new Map<string, Discipline[]>();
    for (const d of disciplines) {
      const key = d.group_id ?? UNGROUPED;
      byGroup.set(key, [...(byGroup.get(key) ?? []), d]);
    }
    return byGroup;
  }, [disciplines]);

  function DisciplineCard({ d }: { d: Discipline }) {
    const modules = d.modules ?? [];
    const nextEvalDate = nearestEvaluationDate(d);
    const daysLeft = daysUntil(nextEvalDate);
    const eta = calcETA(modules, d.horas_semana);
    const doneCount = modules.filter((m) => m.status === "done").length;

    return (
      <div
        className={`bg-card rounded-xl overflow-hidden border ${urgencyBorderClass(nextEvalDate)}`}
        style={editingId === d.id ? { gridColumn: "span 2" } : undefined}
      >
        <div className="h-[3px]" style={{ background: d.color }} />
        <div className="p-3">
          <div className="flex items-start justify-between mb-2.5">
            <div className="flex-1 min-w-0 mr-2">
              <div className="text-[13px] font-bold text-txt mb-0.5">
                <InlineEdit value={d.name} onSave={(v) => updateDiscipline(d.id, { name: v })} />
              </div>
              <div className="text-[11px] text-muted truncate">
                {d.type} · {modules.length} mód. · {d.horas_semana}h/sem
              </div>
            </div>
            <div className="flex gap-1 items-center flex-shrink-0">
              {daysLeft !== null && daysLeft <= 7 && (
                <Tip label={`Prova em ${daysLeft} dias!`}>
                  <span className="text-xs cursor-default">⚠️</span>
                </Tip>
              )}
              <button
                onClick={() => (editingId === d.id ? stopEditing() : startEditing(d))}
                className={`w-5 h-5 rounded border text-[10px] flex items-center justify-center cursor-pointer ${
                  editingId === d.id
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-card2 border-border text-muted hover:text-txt"
                }`}
                title="Editar matéria"
              >
                ✎
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Remover "${d.name}" e todos os seus ${modules.length} módulos?`)) {
                    removeDiscipline(d.id);
                  }
                }}
                className="w-5 h-5 rounded bg-card2 border border-border text-muted hover:text-danger text-[10px] flex items-center justify-center cursor-pointer"
                title="Remover matéria"
              >
                ✕
              </button>
            </div>
          </div>

          {editingId === d.id && editForm ? (
            <div className="bg-card2 border border-border rounded-lg p-2.5 mb-2.5 flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] uppercase tracking-wide text-muted">Horas/semana</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.horas_semana}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, horas_semana: Number(e.target.value) || 1 } : f))
                    }
                    className="bg-card border border-border rounded-md px-2 py-1 text-xs text-txt outline-none focus:border-primary w-20"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] uppercase tracking-wide text-muted">Prioridade</label>
                  <select
                    value={editForm.prioridade}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, prioridade: e.target.value as Priority } : f))
                    }
                    className="bg-card border border-border rounded-md px-2 py-1 text-xs text-txt outline-none focus:border-primary"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] uppercase tracking-wide text-muted" title="Usada só se a matéria não tiver nenhuma avaliação cadastrada abaixo">
                    Data da prova (legado)
                  </label>
                  <input
                    type="date"
                    value={editForm.exam_date}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, exam_date: e.target.value } : f))}
                    className="bg-card border border-border rounded-md px-2 py-1 text-xs text-txt outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] uppercase tracking-wide text-muted">Grupo</label>
                  <select
                    value={editForm.group_id ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, group_id: e.target.value || null } : f))
                    }
                    className="bg-card border border-border rounded-md px-2 py-1 text-xs text-txt outline-none focus:border-primary max-w-[140px]"
                  >
                    <option value="">Sem grupo</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={() => handleSaveEdit(d.id)}>
                Salvar
              </Button>

              <div className="border-t border-border pt-2 flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wide text-muted">
                  Provas e avaliações
                </label>
                <div className="text-[10px] text-dim leading-relaxed">
                  Cadastre cada prova/trabalho com sua data — o calendário prioriza a mais próxima
                  automaticamente e a IA reorganiza a semana conforme elas se aproximam.
                </div>
                {(d.evaluations ?? []).length > 0 && (
                  <div className="flex flex-col gap-1">
                    {(d.evaluations ?? []).map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center gap-1.5 bg-card border border-border rounded-md px-2 py-1"
                      >
                        <span className="flex-1 text-[11px] text-txt truncate">{ev.name}</span>
                        <span className="font-mono text-[10px] text-muted shrink-0">
                          {new Date(ev.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                        {ev.weight !== null && (
                          <span className="font-mono text-[9px] text-muted shrink-0">{ev.weight}%</span>
                        )}
                        <button
                          onClick={() => removeEvaluation(d.id, ev.id)}
                          className="w-3.5 h-3.5 rounded-full bg-card2 text-muted hover:text-danger text-[8px] flex items-center justify-center cursor-pointer shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    value={newEvaluationForm.name}
                    onChange={(e) => setNewEvaluationForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Prova 1, Trabalho final..."
                    className="flex-1 min-w-[110px] bg-card border border-border rounded-md px-2 py-1 text-[11px] text-txt outline-none focus:border-primary"
                  />
                  <input
                    type="date"
                    value={newEvaluationForm.date}
                    onChange={(e) => setNewEvaluationForm((f) => ({ ...f, date: e.target.value }))}
                    className="bg-card border border-border rounded-md px-1.5 py-1 text-[11px] text-txt outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newEvaluationForm.weight}
                    onChange={(e) => setNewEvaluationForm((f) => ({ ...f, weight: e.target.value }))}
                    placeholder="%"
                    title="Peso (opcional)"
                    className="w-14 bg-card border border-border rounded-md px-1.5 py-1 text-[11px] text-txt outline-none focus:border-primary"
                  />
                  <Button size="sm" onClick={() => handleAddEvaluation(d.id)}>+ Adicionar</Button>
                </div>
              </div>

              <div className="border-t border-border pt-2 flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wide text-muted">
                  Horário fixo (recorrência semanal)
                </label>
                <div className="text-[10px] text-dim leading-relaxed">
                  Um compromisso que se repete toda semana (ex: aula presencial) — o Scheduler sempre
                  reserva esse horário pra essa matéria, em vez de distribuir proporcionalmente.
                </div>
                {(d.fixed_schedule ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(d.fixed_schedule ?? []).map((slot, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 bg-card border border-border rounded-full pl-2.5 pr-1 py-0.5"
                      >
                        <span className="text-[10px] text-txt">
                          {DAYS_LABELS[slot.dayOfWeek]} · {SLOT_LABELS[slot.slotIndex]}
                        </span>
                        <button
                          onClick={() => handleRemoveFixedSlot(d, slot)}
                          className="w-3.5 h-3.5 rounded-full bg-card2 text-muted hover:text-danger text-[8px] flex items-center justify-center cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <select
                    value={newFixedSlot.dayOfWeek}
                    onChange={(e) =>
                      setNewFixedSlot((s) => ({ ...s, dayOfWeek: Number(e.target.value) }))
                    }
                    className="bg-card border border-border rounded-md px-1.5 py-1 text-[11px] text-txt outline-none focus:border-primary"
                  >
                    {DAYS_LABELS.map((label, i) => (
                      <option key={i} value={i}>{label}</option>
                    ))}
                  </select>
                  <select
                    value={newFixedSlot.slotIndex}
                    onChange={(e) =>
                      setNewFixedSlot((s) => ({ ...s, slotIndex: Number(e.target.value) }))
                    }
                    className="bg-card border border-border rounded-md px-1.5 py-1 text-[11px] text-txt outline-none focus:border-primary"
                  >
                    {SLOT_LABELS.map((label, i) => (
                      <option key={i} value={i}>{label}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => handleAddFixedSlot(d)}>+ Fixar</Button>
                </div>
              </div>

              <div className="border-t border-border pt-2 flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wide text-muted">Módulos</label>
                {modules.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5">
                    <div className="flex-1 text-xs text-txt min-w-0">
                      <InlineEdit value={m.name} onSave={(v) => updateModule(d.id, m.id, { name: v })} />
                    </div>
                    <span
                      onClick={() => updateModuleStatus(d.id, m.id, nextModuleStatus(m.status))}
                      title="Clique para mudar status"
                      className={`font-mono text-[9px] px-1 py-0.5 rounded cursor-pointer shrink-0 whitespace-nowrap ${moduleStatusClasses(m.status)}`}
                    >
                      {moduleStatusLabel(m.status)}
                    </span>
                    <input
                      type="number"
                      min={1}
                      defaultValue={m.estimated_hours}
                      onBlur={(e) => {
                        const hours = Number(e.target.value) || 1;
                        if (hours !== m.estimated_hours) updateModule(d.id, m.id, { estimated_hours: hours });
                      }}
                      className="bg-card border border-border rounded-md px-1.5 py-0.5 text-[11px] text-txt outline-none focus:border-primary w-14 shrink-0"
                    />
                    <button
                      onClick={() => removeModule(d.id, m.id)}
                      className="w-4 h-4 rounded bg-card border border-border text-muted hover:text-danger text-[9px] flex items-center justify-center cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    value={newModuleForm.name}
                    onChange={(e) => setNewModuleForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Novo módulo"
                    className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs text-txt outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min={1}
                    value={newModuleForm.estimated_hours}
                    onChange={(e) =>
                      setNewModuleForm((f) => ({ ...f, estimated_hours: Number(e.target.value) || 1 }))
                    }
                    className="bg-card border border-border rounded-md px-1.5 py-1 text-xs text-txt outline-none focus:border-primary w-14 shrink-0"
                  />
                  <Button size="sm" onClick={() => handleAddModule(d.id)}>+ Adicionar</Button>
                </div>
              </div>
            </div>
          ) : (
          <>
          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            <div className="bg-card2 rounded-md py-1 px-1.5 text-center">
              <div className="font-mono text-xs font-semibold leading-none" style={{ color: d.color }}>
                {d.horas_semana}h
              </div>
              <div className="text-[10px] text-muted mt-0.5">por semana</div>
            </div>
            <div className="bg-card2 rounded-md py-1 px-1.5 text-center">
              <div className="font-mono text-xs font-semibold leading-none text-success">
                {d.progress}%
              </div>
              <div className="text-[10px] text-muted mt-0.5">concluído</div>
            </div>
            <div className="bg-card2 rounded-md py-1 px-1.5 text-center">
              <div
                className={`font-mono text-xs font-semibold leading-none ${
                  daysLeft !== null && daysLeft <= 3 ? "text-danger" : "text-warning"
                }`}
              >
                {daysLeft !== null ? `${daysLeft}d` : "—"}
              </div>
              <div className="text-[10px] text-muted mt-0.5">para a prova</div>
            </div>
          </div>

          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-muted">Progresso</span>
            <span className="font-mono font-semibold text-txt">{d.progress}%</span>
          </div>
          <div className="h-[3px] bg-card2 rounded-sm mb-2.5 overflow-hidden">
            <div
              className="h-[3px] rounded-sm transition-all duration-500"
              style={{ background: d.color, width: `${d.progress}%` }}
            />
          </div>

          {eta !== null && (
            <div className="bg-card2 border border-border rounded-md py-1 px-2 mb-2 flex items-center gap-1.5">
              <span className="text-[11px]">🎯</span>
              <span className="text-[11px] text-dim">
                Conclui em <strong className="text-txt">{eta} {eta === 1 ? "semana" : "semanas"}</strong> no ritmo atual
              </span>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {modules.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 text-[11px] text-dim">
                <div
                  className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${
                    m.status === "done" ? "bg-success" : m.status === "prog" ? "bg-primary" : "bg-muted"
                  }`}
                />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{m.name}</span>
                <span
                  onClick={() => updateModuleStatus(d.id, m.id, nextModuleStatus(m.status))}
                  title="Clique para mudar status"
                  className={`font-mono text-[9px] px-1 py-0.5 rounded cursor-pointer ${moduleStatusClasses(m.status)}`}
                >
                  {moduleStatusLabel(m.status)}
                </span>
              </div>
            ))}
            {modules.length > 4 && (
              <div className="text-[10px] text-muted pl-[11px]">+{modules.length - 4} módulos</div>
            )}
          </div>
          </>
          )}
        </div>
        <div className="py-1.5 px-3 border-t border-border flex justify-between items-center">
          <div className="text-[11px] text-muted">
            <strong className="text-dim">{doneCount}</strong>/{modules.length} módulos concluídos
          </div>
          <Link href={buildSessionHref(d, modules)}>
            <Button size="sm">▶ Estudar</Button>
          </Link>
        </div>
      </div>
    );
  }

  function GroupSection({ group, items }: { group: DisciplineGroup | null; items: Discipline[] }) {
    // A named group always renders, even empty — right after creating one, the user needs to see
    // it exists to assign matérias to it. Only the "Sem grupo" bucket hides itself when empty.
    if (!items.length && !group) return null;
    return (
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Folder className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={2} />
            {group ? (
              <div className="text-xs font-semibold text-dim">
                <InlineEdit value={group.name} onSave={(v) => renameGroup(group.id, v)} />
              </div>
            ) : (
              <span className="text-xs font-semibold text-muted">Sem grupo</span>
            )}
            <span className="font-mono text-[10px] text-muted shrink-0">{items.length}</span>
          </div>
          {group && (
            <button
              onClick={() => handleDeleteGroup(group)}
              className="w-5 h-5 rounded bg-card2 border border-border text-muted hover:text-danger text-[10px] flex items-center justify-center cursor-pointer shrink-0"
              title="Remover grupo (matérias ficam sem grupo)"
            >
              <X className="w-3 h-3" strokeWidth={2} />
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="text-[11px] text-muted border border-dashed border-border rounded-lg px-3 py-2.5">
            Nenhuma matéria aqui ainda — edite uma matéria e escolha &ldquo;{group?.name}&rdquo; no campo Grupo.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))" }}>
            {items.map((d) => (
              <DisciplineCard key={d.id} d={d} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between flex-wrap gap-2.5 mb-5">
        <div>
          <div className="font-mono text-[10px] font-semibold tracking-[0.1em] uppercase text-muted mb-0.5">
            Gestão
          </div>
          <div className="font-serif text-lg font-semibold text-txt mb-1">Matérias</div>
          <div className="text-xs text-dim">
            Calendário gerado proporcionalmente às horas de cada matéria. Organize-as em grupos —
            ex: &ldquo;Faculdade&rdquo;, &ldquo;Projeto pessoal&rdquo; — se quiser separar contextos.
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-start">
          {addingGroup ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateGroup();
                  if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); }
                }}
                placeholder="Nome do grupo"
                className="bg-card2 border border-border rounded-lg px-2.5 py-1.5 text-sm text-txt outline-none focus:border-primary w-40"
              />
              <Button size="sm" onClick={handleCreateGroup}>Criar</Button>
              <Button variant="ghost" size="sm" onClick={() => { setAddingGroup(false); setNewGroupName(""); }}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAddingGroup(true)}>
              <FolderPlus className="w-3.5 h-3.5" strokeWidth={2} />
              Novo grupo
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
            + Nova matéria
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted">Nome</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome da matéria"
              className="bg-card2 border border-border rounded-lg px-2.5 py-1.5 text-sm text-txt outline-none focus:border-primary min-w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted">Horas/semana</label>
            <input
              type="number"
              min={1}
              value={form.horas_semana}
              onChange={(e) => setForm((f) => ({ ...f, horas_semana: Number(e.target.value) || 1 }))}
              className="bg-card2 border border-border rounded-lg px-2.5 py-1.5 text-sm text-txt outline-none focus:border-primary w-24"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted">Prioridade</label>
            <select
              value={form.prioridade}
              onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value as Priority }))}
              className="bg-card2 border border-border rounded-lg px-2.5 py-1.5 text-sm text-txt outline-none focus:border-primary"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted">Data da prova</label>
            <input
              type="date"
              value={form.exam_date}
              onChange={(e) => setForm((f) => ({ ...f, exam_date: e.target.value }))}
              className="bg-card2 border border-border rounded-lg px-2.5 py-1.5 text-sm text-txt outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <label className="text-[10px] uppercase tracking-wide text-muted block mb-1.5">
            Importar ementa (PDF ou texto) — opcional
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain"
              disabled={parsing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file);
                e.target.value = "";
              }}
              className="text-xs text-dim file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:bg-card2 file:text-txt file:text-xs file:cursor-pointer cursor-pointer"
            />
            {parsing && <span className="text-xs text-muted">Extraindo módulos com o Curriculum Agent…</span>}
          </div>

          {parsedModules.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="text-[11px] text-dim">
                {parsedModules.length} módulos extraídos — serão adicionados junto com a matéria:
              </div>
              {parsedModules.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-card2 border border-border rounded-lg px-2.5 py-1.5"
                >
                  <span className="flex-1 text-xs text-txt truncate">{m.name}</span>
                  <span className="font-mono text-[10px] text-muted shrink-0">{m.estimatedHours}h</span>
                  <button
                    onClick={() => setParsedModules((p) => p.filter((_, mi) => mi !== i))}
                    className="w-4 h-4 rounded bg-card border border-border text-muted hover:text-danger text-[9px] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleAdd}>Adicionar</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowForm(false); setForm(emptyForm); setParsedModules([]); }}
          >
            Cancelar
          </Button>
        </div>
        </div>
      )}

      {disciplines.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma matéria ainda"
          description="Adicione sua primeira disciplina para que o StudyAI gere um calendário personalizado com base nas suas horas e módulos."
          cta="+ Adicionar primeira matéria"
          onCta={() => setShowForm(true)}
        />
      ) : (
        <>
          {groups.map((g) => (
            <GroupSection key={g.id} group={g} items={grouped.get(g.id) ?? []} />
          ))}
          <GroupSection group={null} items={grouped.get(UNGROUPED) ?? []} />
        </>
      )}
    </div>
  );
}
