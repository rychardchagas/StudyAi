"use client";
// Onboarding flow — 4 steps: profile, disciplines, modules, schedule
// No auth, single local user. Persists to /api/profile, /api/disciplines and
// best-effort triggers /api/calendar/generate before landing on /dashboard.
// There is no onboarding flow in the prototype (StudyAI.jsx) to port — this
// screen was designed from scratch to match the app's visual language.
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { SchedGrid } from "@/components/shared/SchedGrid";
import type { Discipline, Priority } from "@/types";

interface ModuleDraft {
  name: string;
  estimated_hours: number;
}

interface DisciplineDraft {
  name: string;
  horas_semana: number;
  prioridade: Priority;
  exam_date: string;
  modules: ModuleDraft[];
}

const inputCls =
  "w-full bg-card2 border border-border rounded-lg px-3 py-2 text-sm text-txt outline-none focus:border-primary/50 placeholder:text-muted";
const labelCls = "text-xs font-medium text-dim block mb-1";

const newDiscipline = (): DisciplineDraft => ({
  name: "",
  horas_semana: 4,
  prioridade: "Média",
  exam_date: "",
  modules: [],
});

// A few reasonable weekday-evening defaults (Mon-Fri, 19h & 20h) — index 13/14 of SLOT_LABELS.
const defaultSlots = (): Record<string, boolean> => {
  const slots: Record<string, boolean> = {};
  for (let day = 0; day < 5; day++) {
    slots[`${day}-13`] = true;
    slots[`${day}-14`] = true;
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

  // Step 4 — availability
  const [slots, setSlots] = useState<Record<string, boolean>>(defaultSlots());

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
              .map((m) => ({ name: m.name.trim(), estimated_hours: m.estimated_hours || undefined })),
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
          preferences: { availability: slots },
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
      await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplines: created, availability }),
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
          <h1 className="text-lg font-bold text-txt mb-1">
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
                <Button variant="outline" size="sm" onClick={addDiscipline}>
                  + Adicionar matéria
                </Button>
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
                                      className={inputCls}
                                      placeholder="Nome do módulo/capítulo"
                                      value={m.name}
                                      onChange={(e) => updateModule(di, mi, { name: e.target.value })}
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      title="Horas estimadas"
                                      className={`${inputCls} w-20 shrink-0`}
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
                <SchedGrid slots={slots} setSlots={setSlots} />
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
