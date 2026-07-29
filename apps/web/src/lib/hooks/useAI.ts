"use client";
import { useState, useCallback } from "react";
import { sendToOrchestrator, type AgentMessage, type OrchestratorContext } from "@/lib/agents/orchestrator";

export function useAI(context?: OrchestratorContext) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      role: "assistant",
      content: "Olá! Posso ajudar a otimizar seu calendário, criar perguntas de active recall ou analisar seu progresso. O que precisas?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (content: string) => {
    const userMsg: AgentMessage = { role: "user", content };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);
    try {
      const reply = await sendToOrchestrator([...messages, userMsg], context);
      setMessages((p) => [...p, { role: "assistant", content: reply }]);
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Erro ao conectar ao agente. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, context]);

  return { messages, loading, send };
}
