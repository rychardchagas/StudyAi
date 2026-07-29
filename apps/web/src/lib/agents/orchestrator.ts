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

export async function sendToOrchestrator(
  messages: AgentMessage[],
  context?: OrchestratorContext
): Promise<string> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
  });

  if (!res.ok) throw new Error("Orchestrator request failed");
  const data = await res.json();
  return data.content;
}
