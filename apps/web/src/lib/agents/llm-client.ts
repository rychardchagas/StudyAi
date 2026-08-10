import OpenAI from "openai";
import { getProfile } from "@/lib/db/local-db";

// Points at a local Ollama instance by default — free, private, no API key needed.
export const DEFAULT_LLM_BASE_URL = "http://localhost:11434/v1";
export const DEFAULT_LLM_MODEL = "qwen2.5:7b";

export interface LlmConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

// Precedence: profile.preferences.ai (set live in Configurações → IA & Agentes) > env vars in
// apps/web/.env.local > built-in Ollama default. Resolved fresh on every call — not a
// module-level singleton — so a provider saved in Settings takes effect on the very next AI
// call, with no server restart. Storing the key in the local SQLite profile is consistent with
// this app's whole trust model (single local user, no auth, no cloud sync — see CLAUDE.md);
// it's never sent anywhere except straight to the configured provider's own API.
export function getLlmConfig(): LlmConfig {
  let saved: Partial<LlmConfig> = {};
  try {
    const ai = getProfile().preferences?.ai as Partial<LlmConfig> | undefined;
    if (ai) saved = ai;
  } catch {
    // DB not reachable yet (e.g. at build time) — env vars/defaults still apply below.
  }
  return {
    baseURL: saved.baseURL || process.env.LLM_BASE_URL || DEFAULT_LLM_BASE_URL,
    apiKey: saved.apiKey || process.env.LLM_API_KEY || "ollama", // Ollama ignores the key entirely — the SDK just requires a non-empty string.
    model: saved.model || process.env.LLM_MODEL || DEFAULT_LLM_MODEL,
  };
}

export function getLlmClient(config: LlmConfig = getLlmConfig()): { client: OpenAI; model: string } {
  return { client: new OpenAI({ baseURL: config.baseURL, apiKey: config.apiKey }), model: config.model };
}
