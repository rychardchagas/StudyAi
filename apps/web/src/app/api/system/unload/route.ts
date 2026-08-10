import { NextResponse } from "next/server";
import { getLlmConfig } from "@/lib/agents/llm-client";

// Ollama's OpenAI-compat layer (lib/agents/llm-client.ts's `llm`) has no "unload" concept — this
// hits Ollama's own native API instead, which does: sending keep_alive: 0 with no prompt is
// Ollama's documented way to force a loaded model out of RAM/VRAM immediately.

// Called via navigator.sendBeacon() when the tab/browser closes (see UnloadOnClose) — the user
// wants memory freed as soon as they're actually done, not after riding out OLLAMA_KEEP_ALIVE's
// idle timer while the tab might still be open. Ollama-specific; silently no-ops for any other
// OpenAI-compatible provider (Groq, OpenRouter...) the user has configured, since there's no
// equivalent standard endpoint and this is a local-memory nicety, not a feature those need.
export async function POST() {
  try {
    const { baseURL, model } = getLlmConfig();
    const ollamaNativeBase = baseURL.replace(/\/v1\/?$/, "");
    await fetch(`${ollamaNativeBase}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, keep_alive: 0 }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Best-effort: Ollama might not be running, might not be the configured provider, or the
    // request might race the browser actually closing — none of that should surface an error.
  }
  return new NextResponse(null, { status: 204 });
}
