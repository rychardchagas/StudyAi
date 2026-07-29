/**
 * Orchestrator tool-use — lets the in-app AI assistant actually change data
 * (add/edit disciplines and modules, fix a weekly class time, update availability)
 * instead of only talking about it. Each tool resolves disciplines/modules by
 * name (fuzzy, case-insensitive) so the model never needs to know internal IDs.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  createDiscipline,
  createModule,
  deleteDiscipline,
  getProfile,
  listDisciplines,
  updateDiscipline,
  updateModule,
  updateProfile,
} from "@/lib/db/local-db";
import { DAYS_LABELS, SLOT_LABELS } from "@/lib/utils/constants";
import type { Discipline, FixedSlot, Module, ModuleStatus, Priority } from "@/types";

function findDiscipline(name: string): Discipline | undefined {
  const disciplines = listDisciplines();
  const query = name.trim().toLowerCase();
  return (
    disciplines.find((d) => d.name.toLowerCase() === query) ??
    disciplines.find((d) => d.name.toLowerCase().includes(query) || query.includes(d.name.toLowerCase()))
  );
}

function findModule(discipline: Discipline, name: string): Module | undefined {
  const query = name.trim().toLowerCase();
  const modules = discipline.modules ?? [];
  return (
    modules.find((m) => m.name.toLowerCase() === query) ??
    modules.find((m) => m.name.toLowerCase().includes(query) || query.includes(m.name.toLowerCase()))
  );
}

function dayIndex(label: string): number {
  const i = DAYS_LABELS.findIndex((d) => d.toLowerCase() === label.trim().toLowerCase());
  if (i === -1) throw new Error(`Dia inválido: "${label}". Use um de: ${DAYS_LABELS.join(", ")}`);
  return i;
}

function slotIndex(label: string): number {
  const normalized = label.trim().toLowerCase().replace(/\s/g, "");
  const i = SLOT_LABELS.findIndex((s) => s.toLowerCase() === normalized);
  if (i === -1) throw new Error(`Horário inválido: "${label}". Use um de: ${SLOT_LABELS.join(", ")}`);
  return i;
}

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "add_discipline",
    description: "Cadastra uma nova disciplina/matéria de estudo.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome da matéria" },
        horas_semana: { type: "number", description: "Horas de estudo desejadas por semana" },
        prioridade: { type: "string", enum: ["Alta", "Média", "Baixa"] },
        exam_date: { type: "string", description: "Data da prova, formato YYYY-MM-DD (opcional)" },
        modules: {
          type: "array",
          description: "Módulos/tópicos iniciais (opcional)",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              estimated_hours: { type: "number" },
            },
            required: ["name"],
          },
        },
      },
      required: ["name", "horas_semana", "prioridade"],
    },
  },
  {
    name: "update_discipline",
    description: "Atualiza horas por semana, prioridade e/ou data de prova de uma matéria existente.",
    input_schema: {
      type: "object",
      properties: {
        discipline_name: { type: "string", description: "Nome (ou parte do nome) da matéria" },
        horas_semana: { type: "number" },
        prioridade: { type: "string", enum: ["Alta", "Média", "Baixa"] },
        exam_date: { type: "string", description: "Formato YYYY-MM-DD" },
      },
      required: ["discipline_name"],
    },
  },
  {
    name: "remove_discipline",
    description: "Remove uma matéria e todos os seus módulos.",
    input_schema: {
      type: "object",
      properties: { discipline_name: { type: "string" } },
      required: ["discipline_name"],
    },
  },
  {
    name: "add_module",
    description: "Adiciona um módulo/tópico a uma matéria existente.",
    input_schema: {
      type: "object",
      properties: {
        discipline_name: { type: "string" },
        module_name: { type: "string" },
        estimated_hours: { type: "number" },
      },
      required: ["discipline_name", "module_name"],
    },
  },
  {
    name: "update_module_status",
    description: "Marca um módulo como pendente, em andamento ou concluído.",
    input_schema: {
      type: "object",
      properties: {
        discipline_name: { type: "string" },
        module_name: { type: "string" },
        status: { type: "string", enum: ["pend", "prog", "done"] },
      },
      required: ["discipline_name", "module_name", "status"],
    },
  },
  {
    name: "set_fixed_schedule",
    description:
      "Define horários fixos recorrentes (toda semana) para uma matéria, como uma aula presencial. " +
      "Substitui a lista de horários fixos anteriores dessa matéria pela nova lista enviada.",
    input_schema: {
      type: "object",
      properties: {
        discipline_name: { type: "string" },
        slots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "string", enum: DAYS_LABELS as unknown as string[], description: "Seg, Ter, Qua, Qui, Sex, Sáb ou Dom" },
              time: { type: "string", description: `Um de: ${SLOT_LABELS.join(", ")}` },
            },
            required: ["day", "time"],
          },
        },
      },
      required: ["discipline_name", "slots"],
    },
  },
  {
    name: "set_availability",
    description: "Marca um ou mais horários da semana como disponíveis ou indisponíveis para estudo.",
    input_schema: {
      type: "object",
      properties: {
        slots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "string", enum: DAYS_LABELS as unknown as string[] },
              time: { type: "string", description: `Um de: ${SLOT_LABELS.join(", ")}` },
              available: { type: "boolean" },
            },
            required: ["day", "time", "available"],
          },
        },
      },
      required: ["slots"],
    },
  },
];

export function executeTool(name: string, input: Record<string, unknown>): { result: string; changed: boolean } {
  switch (name) {
    case "add_discipline": {
      const modules = Array.isArray(input.modules)
        ? (input.modules as Array<{ name: string; estimated_hours?: number }>)
        : undefined;
      const created = createDiscipline({
        name: String(input.name),
        horas_semana: Number(input.horas_semana) || 4,
        prioridade: input.prioridade as Priority,
        exam_date: (input.exam_date as string) || null,
      });
      modules?.forEach((m, i) => createModule({ discipline_id: created.id, name: m.name, estimated_hours: m.estimated_hours, order_index: i }));
      return { result: `Matéria "${created.name}" cadastrada.`, changed: true };
    }

    case "update_discipline": {
      const disc = findDiscipline(String(input.discipline_name));
      if (!disc) return { result: `Não encontrei uma matéria chamada "${input.discipline_name}".`, changed: false };
      const updates: Partial<Discipline> = {};
      if (input.horas_semana !== undefined) updates.horas_semana = Number(input.horas_semana);
      if (input.prioridade !== undefined) updates.prioridade = input.prioridade as Priority;
      if (input.exam_date !== undefined) updates.exam_date = String(input.exam_date);
      updateDiscipline(disc.id, updates);
      return { result: `Matéria "${disc.name}" atualizada.`, changed: true };
    }

    case "remove_discipline": {
      const disc = findDiscipline(String(input.discipline_name));
      if (!disc) return { result: `Não encontrei uma matéria chamada "${input.discipline_name}".`, changed: false };
      deleteDiscipline(disc.id);
      return { result: `Matéria "${disc.name}" removida.`, changed: true };
    }

    case "add_module": {
      const disc = findDiscipline(String(input.discipline_name));
      if (!disc) return { result: `Não encontrei uma matéria chamada "${input.discipline_name}".`, changed: false };
      createModule({
        discipline_id: disc.id,
        name: String(input.module_name),
        estimated_hours: input.estimated_hours ? Number(input.estimated_hours) : undefined,
        order_index: (disc.modules ?? []).length,
      });
      return { result: `Módulo "${input.module_name}" adicionado a "${disc.name}".`, changed: true };
    }

    case "update_module_status": {
      const disc = findDiscipline(String(input.discipline_name));
      if (!disc) return { result: `Não encontrei uma matéria chamada "${input.discipline_name}".`, changed: false };
      const mod = findModule(disc, String(input.module_name));
      if (!mod) return { result: `Não encontrei o módulo "${input.module_name}" em "${disc.name}".`, changed: false };
      updateModule(mod.id, { status: input.status as ModuleStatus });
      return { result: `Módulo "${mod.name}" marcado como "${input.status}".`, changed: true };
    }

    case "set_fixed_schedule": {
      const disc = findDiscipline(String(input.discipline_name));
      if (!disc) return { result: `Não encontrei uma matéria chamada "${input.discipline_name}".`, changed: false };
      const rawSlots = Array.isArray(input.slots) ? (input.slots as Array<{ day: string; time: string }>) : [];
      const fixed_schedule: FixedSlot[] = rawSlots.map((s) => ({ dayOfWeek: dayIndex(s.day), slotIndex: slotIndex(s.time) }));
      updateDiscipline(disc.id, { fixed_schedule });
      return { result: `Horário fixo de "${disc.name}" atualizado (${rawSlots.length} horário(s)).`, changed: true };
    }

    case "set_availability": {
      const rawSlots = Array.isArray(input.slots)
        ? (input.slots as Array<{ day: string; time: string; available: boolean }>)
        : [];
      const profile = getProfile();
      const availability = { ...(profile.preferences.availability as Record<string, boolean> | undefined) };
      for (const s of rawSlots) {
        availability[`${dayIndex(s.day)}-${slotIndex(s.time)}`] = s.available;
      }
      updateProfile({ preferences: { ...profile.preferences, availability } });
      return { result: `Disponibilidade atualizada (${rawSlots.length} horário(s)).`, changed: true };
    }

    default:
      return { result: `Ferramenta desconhecida: ${name}`, changed: false };
  }
}
