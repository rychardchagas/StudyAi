"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { SchedGrid } from "@/components/shared/SchedGrid";
import { DAYS_LABELS, SLOT_LABELS } from "@/lib/utils/constants";
import { clearActiveSession } from "@/lib/utils/activeSession";
import type { Profile } from "@/types";

interface SettingsClientProps {
  initialProfile: Profile;
}

type SettingsTab = "profile" | "notif" | "horarios" | "ia";

const TABS: [SettingsTab, string][] = [
  ["profile", "Perfil"],
  ["notif", "Notificações"],
  ["horarios", "Horários"],
  ["ia", "IA & Agentes"],
];

const NOTIFICATION_ITEMS: { key: string; label: string; description: string }[] = [
  { key: "sessionReminder", label: "Lembrete de sessão", description: "Notificar 10 min antes de cada bloco" },
  { key: "weeklyReport", label: "Relatório semanal", description: "Domingo às 20h — resumo da semana" },
  { key: "lateReview", label: "Revisão atrasada", description: "Avisar quando revisão espaçada está vencida" },
  { key: "streakRisk", label: "Streak em risco", description: "Alertar se não houver sessão até 21h" },
  { key: "nightSilence", label: "Silêncio noturno", description: "Sem notificações entre 23h–7h" },
];

const AI_MODEL_OPTIONS = [
  "qwen2.5:7b (recomendado, Ollama local)",
  "llama3.1:8b (Ollama local)",
  "Outro (configurar via LLM_MODEL em .env.local)",
];

const REPLAN_AGGRESSIVENESS_OPTIONS = ["Conservador", "Balanceado", "Agressivo"];

const AGENT_ITEMS: { key: string; label: string; description: string }[] = [
  { key: "curriculum", label: "Curriculum Agent", description: "Parseia ementas e organiza módulos" },
  { key: "pedagogy", label: "Pedagogy Agent", description: "Aplica FSRS, interleaving e active recall" },
  { key: "progress", label: "Progress Agent", description: "Monitora aderência e gera insights" },
  { key: "qa", label: "QA Agent", description: "Valida calendários antes de entregar" },
];

function asRecord(value: unknown): Record<string, boolean> {
  return value && typeof value === "object" ? (value as Record<string, boolean>) : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-txt placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors";
const labelClass = "block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted mb-1.5";

export function SettingsClient({ initialProfile }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [saving, setSaving] = useState(false);
  const [fixingProgress, setFixingProgress] = useState(false);
  const [resetting, setResetting] = useState(false);

  const basePreferences = initialProfile.preferences ?? {};

  // Perfil
  const [name, setName] = useState(initialProfile.name ?? "");
  const [email, setEmail] = useState(""); // cosmetic only — no backend field on Profile
  const [bio, setBio] = useState(initialProfile.bio ?? "");

  // Notificações
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() => {
    const stored = asRecord(basePreferences.notifications);
    const seeded: Record<string, boolean> = {};
    for (const item of NOTIFICATION_ITEMS) seeded[item.key] = stored[item.key] ?? true;
    return seeded;
  });

  // Horários
  const [availability, setAvailability] = useState<Record<string, boolean>>(() =>
    asRecord(basePreferences.availability)
  );
  const [restDay, setRestDay] = useState<number | null>(() =>
    typeof basePreferences.restDay === "number" ? basePreferences.restDay : null
  );

  // IA & Agentes
  const [aiModel, setAiModel] = useState(() => asString(basePreferences.aiModel, AI_MODEL_OPTIONS[0]));
  const [replanAggressiveness, setReplanAggressiveness] = useState(() =>
    asString(basePreferences.replanAggressiveness, "Balanceado")
  );
  const [agentsEnabled, setAgentsEnabled] = useState<Record<string, boolean>>(() => {
    const stored = asRecord(basePreferences.agentsEnabled);
    const seeded: Record<string, boolean> = {};
    for (const item of AGENT_ITEMS) seeded[item.key] = stored[item.key] ?? true;
    return seeded;
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          preferences: {
            ...basePreferences,
            notifications,
            availability,
            restDay,
            aiModel,
            replanAggressiveness,
            agentsEnabled,
          },
        }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      // This only PATCHes /api/profile — it does not call /api/calendar/generate. The old copy
      // here ("Salvo e calendário atualizado!") promised a regeneration that never happened;
      // don't restore that wording without actually wiring the regeneration call.
      toast.success("Preferências salvas.");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar as alterações");
    } finally {
      setSaving(false);
    }
  }

  async function handleFixProgress() {
    setFixingProgress(true);
    try {
      const res = await fetch("/api/disciplines/recalculate-progress", { method: "POST" });
      if (!res.ok) throw new Error("Falha ao recalcular");
      const { updated, total } = await res.json();
      if (updated === 0) {
        toast.success(`Progresso já estava correto em todas as ${total} matérias.`);
      } else {
        toast.success(`Progresso corrigido em ${updated} de ${total} matéria(s).`);
      }
    } catch {
      toast.error("Não foi possível recalcular o progresso");
    } finally {
      setFixingProgress(false);
    }
  }

  async function handleResetAll() {
    const confirmed = window.confirm(
      "Isso apaga TODAS as matérias, módulos, grupos e sessões registradas — o calendário e o " +
        "progresso zeram. Seu perfil e preferências continuam. Essa ação não pode ser desfeita. Continuar?"
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await fetch("/api/disciplines/reset", { method: "POST" });
      if (!res.ok) throw new Error("Falha ao apagar os dados");
      // ACTIVE_SESSION_KEY lives in the browser's localStorage, entirely separate from the
      // SQLite data this just wiped — without this, a stale "sessão em andamento" banner for a
      // discipline/module that no longer exists would keep showing after the reset.
      clearActiveSession();
      toast.success("Tudo apagado — hora de começar de novo.");
      router.push("/onboarding");
    } catch {
      toast.error("Não foi possível apagar os dados");
    } finally {
      setResetting(false);
    }
  }

  function selectAllSlots() {
    const next: Record<string, boolean> = {};
    DAYS_LABELS.forEach((_, di) => SLOT_LABELS.forEach((__, si) => (next[`${di}-${si}`] = true)));
    setAvailability(next);
  }

  function handleSetRestDay(day: number | null) {
    setRestDay(day);
    if (day !== null) {
      setAvailability((prev) => {
        const next = { ...prev };
        for (let si = 0; si < SLOT_LABELS.length; si++) delete next[`${day}-${si}`];
        return next;
      });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between mb-[18px]">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted mb-[3px]">
            Sistema
          </div>
          <div className="font-serif text-lg font-semibold text-txt">Configurações</div>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <div className="grid grid-cols-[150px_1fr] gap-3.5">
        <div className="flex flex-col gap-0.5">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`text-left text-xs px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                activeTab === id ? "bg-primary/15 text-primary" : "bg-transparent text-dim hover:text-txt"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === "profile" && (
            <div>
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                <div>
                  <label className={labelClass}>Nome</label>
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input
                    className={inputClass}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudante@email.com"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Bio para a IA</label>
                <textarea
                  className={`${inputClass} min-h-[110px] resize-y`}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte à IA como você estuda, seus horários preferidos e preferências de aprendizado."
                />
              </div>

              <div className="h-px bg-border my-3.5" />

              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">
                Manutenção
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <div>
                  <div className="text-xs text-txt mb-0.5">Corrigir progresso das matérias</div>
                  <div className="text-[11px] text-muted">
                    O % de conclusão de cada matéria não é recalculado automaticamente — se ele
                    ficou desatualizado (ex: sempre em 0%), use este botão para recalcular a
                    partir dos módulos realmente marcados como concluídos.
                  </div>
                </div>
                <Button size="sm" onClick={handleFixProgress} disabled={fixingProgress}>
                  {fixingProgress ? "Corrigindo..." : "Corrigir progresso"}
                </Button>
              </div>

              <div className="h-px bg-border my-3.5" />

              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-danger mb-2">
                Zona de risco
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <div>
                  <div className="text-xs text-txt mb-0.5">Apagar tudo e recomeçar</div>
                  <div className="text-[11px] text-muted">
                    Remove todas as matérias, módulos, grupos e sessões registradas — útil para
                    largar um semestre/projeto antigo e montar um plano novo do zero. Não afeta
                    seu perfil nem suas preferências.
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={handleResetAll} disabled={resetting}>
                  {resetting ? "Apagando..." : "Apagar tudo"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "notif" && (
            <div>
              {NOTIFICATION_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0"
                >
                  <div>
                    <div className="text-xs text-txt mb-0.5">{item.label}</div>
                    <div className="text-[11px] text-muted">{item.description}</div>
                  </div>
                  <Toggle
                    checked={notifications[item.key] ?? true}
                    onChange={(v) => setNotifications((p) => ({ ...p, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === "horarios" && (
            <div>
              <div className="text-xs text-dim mb-2.5 leading-relaxed">
                Clique nos slots para marcar disponibilidade. Salvar aqui atualiza sua preferência —
                o calendário só recalcula quando você volta ao Dashboard e clica em “Replanejar”.
              </div>
              <div className="mb-3 bg-card border border-border rounded-lg p-3">
                <div className="text-xs font-semibold text-txt mb-2">Dia de descanso (opcional)</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetRestDay(null)}
                    className={`text-[11px] font-medium rounded-full px-2.5 py-1 cursor-pointer border transition-colors ${
                      restDay === null
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-card2 border-border text-dim hover:text-txt"
                    }`}
                  >
                    Nenhum
                  </button>
                  {DAYS_LABELS.map((label, day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSetRestDay(day)}
                      className={`text-[11px] font-medium rounded-full px-2.5 py-1 cursor-pointer border transition-colors ${
                        restDay === day
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-card2 border-border text-dim hover:text-txt"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <SchedGrid slots={availability} setSlots={setAvailability} disabledDay={restDay} />
              <div className="flex gap-1.5 mt-2.5">
                <Button size="sm" onClick={selectAllSlots}>
                  Selecionar todos
                </Button>
                <Button size="sm" onClick={() => setAvailability({})}>
                  Limpar
                </Button>
              </div>
            </div>
          )}

          {activeTab === "ia" && (
            <div>
              <div className="mb-2.5">
                <label className={labelClass}>Modelo principal</label>
                <select className={inputClass} value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                  {AI_MODEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3.5">
                <label className={labelClass}>Agressividade do replanejamento</label>
                <select
                  className={inputClass}
                  value={replanAggressiveness}
                  onChange={(e) => setReplanAggressiveness(e.target.value)}
                >
                  {REPLAN_AGGRESSIVENESS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-px bg-border mb-3" />

              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mb-2.5">
                Agentes ativos
              </div>
              {AGENT_ITEMS.map((agent) => (
                <div
                  key={agent.key}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0"
                >
                  <div>
                    <div className="text-xs text-txt mb-0.5">{agent.label}</div>
                    <div className="text-[11px] text-muted">{agent.description}</div>
                  </div>
                  <Toggle
                    checked={agentsEnabled[agent.key] ?? true}
                    onChange={(v) => setAgentsEnabled((p) => ({ ...p, [agent.key]: v }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
