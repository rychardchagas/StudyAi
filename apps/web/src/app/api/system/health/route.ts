import { NextRequest, NextResponse } from "next/server";
import { getLlmClient, getLlmConfig, type LlmConfig } from "@/lib/agents/llm-client";
import { describeLlmError } from "@/lib/agents/llm-error";

async function checkHealth(config: LlmConfig) {
  const start = Date.now();
  const { client } = getLlmClient(config);
  try {
    const models = await client.models.list();
    const availableModels = models.data.map((m) => m.id);
    return NextResponse.json({
      reachable: true,
      baseUrl: config.baseURL,
      model: config.model,
      modelAvailable: availableModels.includes(config.model),
      availableModels,
      latencyMs: Date.now() - start,
    });
  } catch (error) {
    const { code, message } = describeLlmError(error, config);
    return NextResponse.json({
      reachable: false,
      baseUrl: config.baseURL,
      model: config.model,
      code,
      message,
      latencyMs: Date.now() - start,
    });
  }
}

// Checks whatever provider is currently saved/active (Configurações → IA & Agentes, or the
// .env.local/Ollama default if nothing's been saved) — what the /agents status page shows.
export async function GET() {
  return checkHealth(getLlmConfig());
}

// Tests an arbitrary, not-yet-saved config — the "Testar conexão" button in Settings uses this so
// the user can confirm a new provider actually works *before* committing to it, without it ever
// touching the profile that every other AI feature in the app reads from.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<LlmConfig>;
  const base = getLlmConfig();
  return checkHealth({
    baseURL: body.baseURL || base.baseURL,
    apiKey: body.apiKey || base.apiKey,
    model: body.model || base.model,
  });
}
