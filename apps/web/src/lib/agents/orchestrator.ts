/**
 * Orchestrator Agent
 * Central coordinator — routes requests to specialized agents
 * Uses Claude Sonnet 4.6 via Anthropic API
 */

export type AgentMessage = { role: "user" | "assistant"; content: string };

export interface OrchestratorContext {
  disciplines: Array<{ name: string; horas: number; prioridade: string; examDate?: string }>;
  weeklyAdherence: number;
  streakDays: number;
  pendingReviews: number;
}

export interface OrchestratorReply {
  content: string;
  actionsPerformed: string[];
}

export async function sendToOrchestrator(
  messages: AgentMessage[],
  context?: OrchestratorContext
): Promise<OrchestratorReply> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.content ?? "Erro ao conectar ao agente. Tente novamente.");
  return { content: data.content, actionsPerformed: data.actionsPerformed ?? [] };
}
