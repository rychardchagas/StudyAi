import OpenAI from "openai";
import { LLM_MODEL } from "@/lib/agents/llm-client";

const baseUrl = process.env.LLM_BASE_URL ?? "http://localhost:11434/v1";

const UNREACHABLE_MESSAGE =
  `Não consegui conectar ao servidor de IA local em ${baseUrl}. Se você está usando Ollama, ` +
  `verifique se ele está rodando (abra o app Ollama, ou rode "ollama serve" no terminal) — ` +
  "o restante do app (calendário, matérias, progresso) continua funcionando normalmente, gerado localmente sem IA.";

export interface LlmErrorInfo {
  status: number;
  code: string;
  message: string;
}

export function describeLlmError(error: unknown): LlmErrorInfo {
  if (error instanceof OpenAI.APIConnectionError) {
    return { status: 503, code: "llm_unreachable", message: UNREACHABLE_MESSAGE };
  }
  if (error instanceof OpenAI.APIError) {
    if (error.status === 404) {
      return {
        status: 404,
        code: "model_not_found",
        message: `Modelo "${LLM_MODEL}" não encontrado no servidor de IA. Se estiver usando Ollama, rode "ollama pull ${LLM_MODEL}" e tente de novo.`,
      };
    }
    if (error.status === 401) {
      return {
        status: 401,
        code: "invalid_key",
        message: "Credenciais inválidas para o provedor de IA configurado. Verifique LLM_API_KEY em apps/web/.env.local.",
      };
    }
  }
  return { status: 500, code: "agent_error", message: "Erro ao conectar ao agente. Tente novamente." };
}
