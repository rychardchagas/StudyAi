import OpenAI from "openai";

// Points at a local Ollama instance by default — free, private, no API key needed.
// Set LLM_BASE_URL/LLM_API_KEY/LLM_MODEL in apps/web/.env.local to swap in any other
// OpenAI-compatible provider (Groq, OpenRouter, LM Studio, Together.ai...) without
// touching the routes that use this client.
export const LLM_MODEL = process.env.LLM_MODEL ?? "qwen2.5:7b";

export const llm = new OpenAI({
  baseURL: process.env.LLM_BASE_URL ?? "http://localhost:11434/v1",
  // Ollama ignores the key entirely — the SDK just requires a non-empty string.
  apiKey: process.env.LLM_API_KEY ?? "ollama",
});
