"use client";
// Onboarding flow — 4 steps: profile, disciplines, modules, schedule
// Saves to the local disciplines API on finish (no auth — single local user)
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingClient() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const handleFinish = async () => {
    // TODO: save disciplines + schedule via /api/disciplines
    // TODO: trigger calendar generation via /api/calendar/generate
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl overflow-hidden">
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
          {/* Step content goes here — see full prototype for implementation */}
          <p className="text-sm text-dim mt-6 mb-8">
            [Conteúdo do passo {step} — copiar do protótipo StudyAI.jsx]
          </p>
          <div className="flex justify-between">
            <button
              onClick={() => step > 1 ? setStep((s) => s - 1) : router.push("/")}
              className="text-sm text-muted cursor-pointer"
            >
              {step === 1 ? "← Início" : "← Voltar"}
            </button>
            <button
              onClick={() => step < 4 ? setStep((s) => s + 1) : handleFinish()}
              className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {step === 4 ? "Gerar calendário ✦" : "Próximo →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
