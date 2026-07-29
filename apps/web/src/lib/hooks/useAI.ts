"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { sendToOrchestrator, type AgentMessage, type OrchestratorContext } from "@/lib/agents/orchestrator";

export function useAI(context?: OrchestratorContext) {
  const router = useRouter();
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Posso otimizar seu calendário, analisar seu progresso, ou fazer alterações pra você — adicionar/editar matérias e módulos, fixar horário de aula, mudar disponibilidade. O que precisas?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (content: string) => {
    const userMsg: AgentMessage = { role: "user", content };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);
    try {
      const { content: reply, actionsPerformed } = await sendToOrchestrator([...messages, userMsg], context);
      setMessages((p) => [...p, { role: "assistant", content: reply }]);
      if (actionsPerformed.length) {
        actionsPerformed.forEach((a) => toast.success(a));
        router.refresh();
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Erro ao conectar ao agente. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, context, router]);

  return { messages, loading, send };
}
