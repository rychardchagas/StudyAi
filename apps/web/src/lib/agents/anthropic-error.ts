import Anthropic from "@anthropic-ai/sdk";

const NO_CREDIT_MESSAGE =
  "Sem crédito disponível na API da Anthropic. As funcionalidades de IA (chat do assistente, importação de PDF, replanejamento avançado) ficam indisponíveis até adicionar créditos em console.anthropic.com/settings/billing — o restante do app (calendário, matérias, progresso) continua funcionando normalmente, gerado localmente sem IA.";

export interface AnthropicErrorInfo {
  status: number;
  code: string;
  message: string;
}

export function describeAnthropicError(error: unknown): AnthropicErrorInfo {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 400 && String(error.message).toLowerCase().includes("credit balance")) {
      return { status: 402, code: "no_credit", message: NO_CREDIT_MESSAGE };
    }
    if (error.status === 401) {
      return {
        status: 401,
        code: "invalid_key",
        message: "Chave de API da Anthropic inválida ou ausente. Verifique ANTHROPIC_API_KEY em apps/web/.env.local.",
      };
    }
  }
  return { status: 500, code: "agent_error", message: "Erro ao conectar ao agente. Tente novamente." };
}
