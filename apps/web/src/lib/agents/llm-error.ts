import OpenAI from "openai";
import { getLlmConfig } from "@/lib/agents/llm-client";

export interface LlmErrorInfo {
  status: number;
  code: string;
  message: string;
}

export function describeLlmError(error: unknown, config: ReturnType<typeof getLlmConfig> = getLlmConfig()): LlmErrorInfo {
  const { baseURL, model } = config;
  if (error instanceof OpenAI.APIConnectionError) {
    return {
      status: 503,
      code: "llm_unreachable",
      message:
        `Não consegui conectar ao servidor de IA em ${baseURL}. Se você está usando Ollama, ` +
        `verifique se ele está rodando (abra o app Ollama, ou rode "ollama serve" no terminal) — ` +
        "o restante do app (calendário, matérias, progresso) continua funcionando normalmente, gerado localmente sem IA.",
    };
  }
  if (error instanceof OpenAI.APIError) {
    if (error.status === 404) {
      return {
        status: 404,
        code: "model_not_found",
        message: `Modelo "${model}" não encontrado no servidor de IA. Se estiver usando Ollama, rode "ollama pull ${model}" e tente de novo.`,
      };
    }
    if (error.status === 401) {
      return {
        status: 401,
        code: "invalid_key",
        message: "Credenciais inválidas para o provedor de IA configurado. Verifique a chave em Configurações → IA & Agentes.",
      };
    }
  }
  return { status: 500, code: "agent_error", message: "Erro ao conectar ao agente. Tente novamente." };
}
