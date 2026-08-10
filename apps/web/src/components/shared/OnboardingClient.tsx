"use client";
// Onboarding flow — 4 steps: profile, disciplines, modules, schedule
// No auth, single local user. Persists to /api/profile, /api/disciplines and
// best-effort triggers /api/calendar/generate before landing on /dashboard.
// There is no onboarding flow in the prototype (StudyAI.jsx) to port — this
// screen was designed from scratch to match the app's visual language.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { SchedGrid } from "@/components/shared/SchedGrid";
import { DAYS_LABELS, SLOT_LABELS } from "@/lib/utils/constants";
import { detectPreferredPeriods, applyPeriodToSlots, type DayPeriod, type DetectedPeriod } from "@/lib/utils/timePreference";
import type { Discipline, Priority, Profile } from "@/types";

interface ModuleDraft {
  name: string;
  estimated_hours: number;
  topics?: string[];
}

interface DisciplineDraft {
  name: string;
  horas_semana: number;
  prioridade: Priority;
  exam_date: string;
  modules: ModuleDraft[];
}

// No width baked in — `inputCls` below adds w-full for the common single-field case. Composing
// `inputCls` (which already carries w-full) with a second width utility (e.g. `w-20` for a narrow
// side-by-side field) doesn't work the way the class order suggests: Tailwind's generated
// stylesheet orders width utilities by its own internal scale, not by where they appear in the
// className string, so `w-full` silently won over `w-20` regardless of order — the exact cause of
// a real bug (module name input crushed to invisible, the hours input ballooning to fill the row
// and showing the reader just a bare number where the module's name should be). Any input placed
// in a flex row next to another sized element should compose from this base, not from `inputCls`.
const inputBaseCls =
  "bg-card2 border border-border rounded-lg px-3 py-2 text-sm text-txt outline-none focus:border-primary/50 placeholder:text-muted";
const inputCls = `w-full ${inputBaseCls}`;
const labelCls = "text-xs font-medium text-dim block mb-1";

const newDiscipline = (): DisciplineDraft => ({
  name: "",
  horas_semana: 4,
  prioridade: "Média",
  exam_date: "",
  modules: [],
});

// A few reasonable weekday-evening defaults (Mon-Fri, 19h & 20h) — resolved by label instead of a
// hardcoded index (used to be "index 13/14", which quietly meant a different pair of hours the
// moment SLOT_LABELS' range changed — see the comment on SLOT_LABELS itself in constants.ts).
const DEFAULT_EVENING_HOURS = ["19h", "20h"];
const defaultSlots = (): Record<string, boolean> => {
  const slots: Record<string, boolean> = {};
  const indices = DEFAULT_EVENING_HOURS.map((h) => SLOT_LABELS.indexOf(h)).filter((i) => i !== -1);
  for (let day = 0; day < 5; day++) {
    for (const si of indices) slots[`${day}-${si}`] = true;
  }
  return slots;
};

export function OnboardingClient() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Step 1 — profile
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  // Step 2/3 — disciplines + modules
  const [disciplines, setDisciplines] = useState<DisciplineDraft[]>([newDiscipline()]);
  const [importingEmentas, setImportingEmentas] = useState(false);
  const [moduleKeywords, setModuleKeywords] = useState("");
  const ementaInputRef = useRef<HTMLInputElement>(null);

  // Step 4 — availability
  const [slots, setSlots] = useState<Record<string, boolean>>(defaultSlots());
  const [restDay, setRestDay] = useState<number | null>(null);

  // This screen is reachable even when a profile already exists (root `/` sends anyone with 0
  // disciplines here — e.g. right after "Apagar tudo" in Configurações, which explicitly promises
  // "não afeta seu perfil nem suas preferências"). Without this, the form always started blank and
  // `handleFinish` below would PATCH a fresh `preferences` object over the real one, silently
  // wiping notifications/agentsEnabled/ai-provider config that had nothing to do with onboarding.
  const existingPreferencesRef = useRef<Record<string, unknown>>({});
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? (res.json() as Promise<Profile>) : null))
      .then((profile) => {
        if (!profile) return;
        existingPreferencesRef.current = profile.preferences ?? {};
        if (profile.name) setName(profile.name);
        if (profile.bio) setBio(profile.bio);
        const savedAvailability = profile.preferences?.availability as Record<string, boolean> | undefined;
        if (savedAvailability && Object.keys(savedAvailability).length > 0) setSlots(savedAvailability);
        const savedRestDay = profile.preferences?.restDay;
        if (typeof savedRestDay === "number") setRestDay(savedRestDay);
      })
      .catch(() => {
        // No profile yet (first-ever run) — keep the blank/default form as-is.
      });
  }, []);
  // "Prefiro estudar à noite" in the bio doesn't do anything on its own — Step 4's availability
  // grid is what actually drives scheduling. This surfaces it as an opt-in suggestion instead of
  // silently pre-checking anything, since the student may have already customized their slots.
  const detectedPeriods = useMemo(() => detectPreferredPeriods(bio), [bio]);
  const [handledPeriods, setHandledPeriods] = useState<Set<DayPeriod>>(new Set());

  function handleApplyPeriod(dp: DetectedPeriod) {
    setSlots((prev) => applyPeriodToSlots(prev, dp.slotRange));
    setHandledPeriods((prev) => new Set(prev).add(dp.period));
    toast.success(`Horários de ${dp.label.toLowerCase()} marcados (seg-sex) — ajuste como quiser.`);
  }

  function handleDismissPeriod(period: DayPeriod) {
    setHandledPeriods((prev) => new Set(prev).add(period));
  }

  const validDisciplines = disciplines.filter((d) => d.name.trim().length > 0);

  const updateDiscipline = (index: number, patch: Partial<DisciplineDraft>) => {
    setDisciplines((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addDiscipline = () => setDisciplines((prev) => [...prev, newDiscipline()]);

  const removeDiscipline = (index: number) =>
    setDisciplines((prev) => prev.filter((_, i) => i !== index));

  const addModule = (disciplineIndex: number) => {
    setDisciplines((prev) =>
      prev.map((d, i) =>
        i === disciplineIndex ? { ...d, modules: [...d.modules, { name: "", estimated_hours: 2 }] } : d
      )
    );
  };

  const updateModule = (disciplineIndex: number, moduleIndex: number, patch: Partial<ModuleDraft>) => {
    setDisciplines((prev) =>
      prev.map((d, i) =>
        i === disciplineIndex
          ? { ...d, modules: d.modules.map((m, mi) => (mi === moduleIndex ? { ...m, ...patch } : m)) }
          : d
      )
    );
  };

  const removeModule = (disciplineIndex: number, moduleIndex: number) => {
    setDisciplines((prev) =>
      prev.map((d, i) =>
        i === disciplineIndex ? { ...d, modules: d.modules.filter((_, mi) => mi !== moduleIndex) } : d
      )
    );
  };

  const handleImportEmentas = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImportingEmentas(true);
    const importedDrafts: DisciplineDraft[] = [];
    const failures: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.append("file", file);
        // No disciplineName sent — bulk import has no name yet, the model infers it from the
        // document itself (see /api/curriculum/parse).
        if (moduleKeywords.trim()) form.append("moduleKeywords", moduleKeywords.trim());
        const res = await fetch("/api/curriculum/parse", { method: "POST", body: form });
        if (!res.ok) throw new Error("parse failed");
        const data: {
          disciplineName?: string;
          estimatedWeeklyHours?: number;
          modules?: Array<{ name: string; estimatedHours?: number; topics?: string[] }>;
        } = await res.json();
        importedDrafts.push({
          name: data.disciplineName || file.name.replace(/\.[^./]+$/, ""),
          horas_semana: data.estimatedWeeklyHours || 4,
          prioridade: "Média",
          exam_date: "",
          modules: (data.modules ?? [])
            .filter((m) => m.name?.trim())
            .map((m) => ({ name: m.name.trim(), estimated_hours: m.estimatedHours || 2, topics: m.topics })),
        });
      } catch (error) {
        console.error("Failed to import ementa", file.name, error);
        failures.push(file.name);
      }
    }

    if (importedDrafts.length > 0) {
      setDisciplines((prev) => {
        // Drop the still-blank starter row before appending imports — otherwise onboarding
        // always carries a dangling untitled discipline nobody filled in.
        const base = prev.filter((d) => d.name.trim().length > 0);
        return [...base, ...importedDrafts];
      });
    }

    setImportingEmentas(false);
    if (importedDrafts.length > 0) {
      toast.success(
        `${importedDrafts.length} ementa${importedDrafts.length > 1 ? "s" : ""} importada${
          importedDrafts.length > 1 ? "s" : ""
        } — confira e ajuste os dados abaixo.`
      );
    }
    if (failures.length > 0) {
      toast.error(`Não foi possível processar: ${failures.join(", ")}`);
    }
  };

  const handleSetRestDay = (day: number | null) => {
    setRestDay(day);
    if (day !== null) {
      setSlots((prev) => {
        const next = { ...prev };
        for (let si = 0; si < SLOT_LABELS.length; si++) delete next[`${day}-${si}`];
        return next;
      });
    }
  };

  const suggestRestDay = () => {
    const counts = Array.from(
      { length: 7 },
      (_, day) => Object.keys(slots).filter((k) => k.startsWith(`${day}-`) && slots[k]).length
    );
    const min = Math.min(...counts);
    // Ties resolve toward Sunday (index 6) — the conventional default rest day.
    let day = 6;
    for (let i = 6; i >= 0; i--) {
      if (counts[i] === min) day = i;
    }
    handleSetRestDay(day);
    toast.success(`Sugestão: ${DAYS_LABELS[day]} como dia de descanso.`);
  };

  const handleFinish = async () => {
    if (validDisciplines.length === 0) {
      toast.error("Adicione ao menos uma matéria antes de continuar.");
      setStep(2);
      return;
    }

    setSubmitting(true);

    // 1. Create each discipline (with its modules), collecting what actually persisted.
    const created: Discipline[] = [];
    for (const d of validDisciplines) {
      try {
        const res = await fetch("/api/disciplines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: d.name.trim(),
            horas_semana: d.horas_semana || 1,
            prioridade: d.prioridade,
            exam_date: d.exam_date || undefined,
            modules: d.modules
              .filter((m) => m.name.trim().length > 0)
              .map((m) => ({ name: m.name.trim(), estimated_hours: m.estimated_hours || undefined, topics: m.topics })),
          }),
        });
        if (res.ok) created.push(await res.json());
      } catch (error) {
        console.error("Failed to create discipline", d.name, error);
      }
    }

    if (created.length === 0) {
      toast.error("Não foi possível salvar suas matérias. Tente novamente.");
      setSubmitting(false);
      return;
    }

    // 2. Persist profile (name/bio + availability preferences).
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          bio: bio.trim() || null,
          preferences: { ...existingPreferencesRef.current, availability: slots, restDay },
        }),
      });
    } catch (error) {
      console.error("Failed to save profile", error);
    }

    // 3. Best-effort calendar generation — never blocks onboarding completion.
    try {
      const availability: Record<number, number[]> = {};
      for (let day = 0; day < 7; day++) {
        availability[day] = Object.keys(slots)
          .filter((k) => k.startsWith(`${day}-`) && slots[k])
          .map((k) => Number(k.split("-")[1]));
      }
      const restDayNote =
        restDay !== null
          ? `O estudante reserva ${DAYS_LABELS[restDay]} como dia de descanso completo — não agende nada nesse dia; redistribua a carga entre os demais dias considerando essa folga.`
          : "";
      const studentContext = [bio.trim(), restDayNote].filter(Boolean).join(" ") || undefined;
      await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplines: created, availability, studentContext }),
      });
    } catch (error) {
      console.error("Calendar generation failed", error);
    }

    toast.success("Tudo pronto! Bem-vindo ao StudyAI.");
    router.push("/dashboard");
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      toast.error("Digite seu nome para continuar.");
      return;
    }
    if (step === 2 && validDisciplines.length === 0) {
      toast.error("Adicione ao menos uma matéria para continuar.");
      return;
    }
    if (step < 4) setStep((s) => s + 1);
    else handleFinish();
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-0.5 bg-card2">
          <div
            className="h-0.5 bg-primary transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
        <div className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-muted mb-1">
            Passo {step} de 4
          </div>
          <h1 className="font-serif text-lg font-semibold text-txt mb-1">
            {["Seu perfil", "Suas matérias", "Conteúdo", "Disponibilidade"][step - 1]}
          </h1>

          <div className="mt-6 mb-8">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Como podemos te chamar?</label>
                  <input
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelCls}>Conte um pouco sobre você (opcional)</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Ex: curso Engenharia, prefiro estudar de manhã, tenho dificuldade em Cálculo..."
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    Isso ajuda a IA a personalizar seu plano de estudos.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {disciplines.map((d, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          className={inputCls}
                          placeholder="Nome da matéria"
                          value={d.name}
                          onChange={(e) => updateDiscipline(i, { name: e.target.value })}
                        />
                        {disciplines.length > 1 && (
                          <button
                            onClick={() => removeDiscipline(i)}
                            title="Remover matéria"
                            className="text-muted hover:text-danger text-lg leading-none px-1.5 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className={labelCls}>Horas/semana</label>
                          <input
                            type="number"
                            min={1}
                            max={40}
                            className={inputCls}
                            value={d.horas_semana}
                            onChange={(e) => updateDiscipline(i, { horas_semana: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Prioridade</label>
                          <select
                            className={inputCls}
                            value={d.prioridade}
                            onChange={(e) => updateDiscipline(i, { prioridade: e.target.value as Priority })}
                          >
                            <option value="Alta">Alta</option>
                            <option value="Média">Média</option>
                            <option value="Baixa">Baixa</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Prova (opcional)</label>
                          <input
                            type="date"
                            className={inputCls}
                            value={d.exam_date}
                            onChange={(e) => updateDiscipline(i, { exam_date: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  value={moduleKeywords}
                  onChange={(e) => setModuleKeywords(e.target.value)}
                  placeholder='Como suas ementas marcam cada módulo? (ex: "Unidade", "Capítulo") — opcional'
                  maxLength={300}
                  className={inputCls}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={addDiscipline}>
                    + Adicionar matéria
                  </Button>
                  <input
                    ref={ementaInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      handleImportEmentas(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => ementaInputRef.current?.click()}
                    disabled={importingEmentas}
                  >
                    {importingEmentas ? "Importando…" : "📄 Importar ementas (PDF/Word/TXT)"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted">
                  Envie uma ou mais ementas — a IA identifica nome, carga horária e módulos de cada
                  matéria automaticamente e preenche a lista acima.
                </p>
              </div>
            )}

            {step === 3 && (
              <div>
                {validDisciplines.length === 0 ? (
                  <p className="text-sm text-dim">
                    Volte ao passo anterior e adicione ao menos uma matéria primeiro.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {disciplines.map(
                      (d, di) =>
                        d.name.trim() && (
                          <div key={di} className="bg-card border border-border rounded-lg p-3">
                            <div className="text-sm font-semibold text-txt mb-2">{d.name}</div>
                            {d.modules.length > 0 && (
                              <div className="space-y-2 mb-2">
                                {d.modules.map((m, mi) => (
                                  <div key={mi} className="flex items-center gap-2">
                                    <input
                                      className={`${inputBaseCls} flex-1 min-w-0`}
                                      placeholder="Nome do módulo/capítulo"
                                      value={m.name}
                                      onChange={(e) => updateModule(di, mi, { name: e.target.value })}
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      title="Horas estimadas"
                                      className={`${inputBaseCls} w-20 shrink-0`}
                                      value={m.estimated_hours}
                                      onChange={(e) =>
                                        updateModule(di, mi, { estimated_hours: Number(e.target.value) })
                                      }
                                    />
                                    <button
                                      onClick={() => removeModule(di, mi)}
                                      title="Remover módulo"
                                      className="text-muted hover:text-danger text-lg leading-none px-1.5 cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => addModule(di)}
                              className="text-xs text-primary cursor-pointer"
                            >
                              + Adicionar módulo
                            </button>
                          </div>
                        )
                    )}
                  </div>
                )}
                <p className="text-[11px] text-muted mt-3">
                  Opcional — você também pode adicionar módulos depois, na tela de Matérias.
                </p>
              </div>
            )}

            {step === 4 && (
              <div>
                <p className="text-xs text-dim mb-3">
                  Marque os horários em que você costuma conseguir estudar. Isso é usado para montar seu
                  calendário automático.
                </p>

                {detectedPeriods
                  .filter((dp) => !handledPeriods.has(dp.period))
                  .map((dp) => (
                    <div
                      key={dp.period}
                      className="mb-3 bg-primary/10 border border-primary/25 rounded-lg p-3 flex items-start gap-2"
                    >
                      <span className="text-sm shrink-0">💡</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-txt leading-relaxed">
                          Notamos no seu perfil uma preferência por estudar à <strong>{dp.period}</strong> — quer
                          marcar automaticamente os horários de {dp.hourRange} (seg-sex)?
                        </div>
                        <div className="flex gap-2.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() => handleApplyPeriod(dp)}
                            className="text-[11px] font-semibold text-primary cursor-pointer hover:underline"
                          >
                            Aplicar sugestão
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismissPeriod(dp.period)}
                            className="text-[11px] text-muted cursor-pointer hover:underline"
                          >
                            Ignorar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                <div className="mb-4 bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-txt">Dia de descanso (opcional)</div>
                    <button
                      type="button"
                      onClick={suggestRestDay}
                      className="text-[11px] text-primary cursor-pointer hover:underline"
                    >
                      ✦ Sugerir automaticamente
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mb-2">
                    Reserve 1 dia livre por semana — nenhuma sessão é agendada nele, e a IA redistribui
                    sua carga nos outros dias considerando essa folga.
                  </p>
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

                <SchedGrid slots={slots} setSlots={setSlots} disabledDay={restDay} />
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => (step > 1 ? setStep((s) => s - 1) : router.push("/"))}
              className="text-sm text-muted cursor-pointer disabled:opacity-40"
              disabled={submitting}
            >
              {step === 1 ? "← Início" : "← Voltar"}
            </button>
            <Button variant="primary" size="md" onClick={handleNext} disabled={submitting}>
              {submitting ? "Gerando..." : step === 4 ? "Gerar calendário ✦" : "Próximo →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
