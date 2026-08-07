import { NextResponse } from "next/server";
import { llm, LLM_MODEL } from "@/lib/agents/llm-client";
import { describeLlmError } from "@/lib/agents/llm-error";

const BASE_URL = process.env.LLM_BASE_URL ?? "http://localhost:11434/v1";

export async function GET() {
  const start = Date.now();
  try {
    const models = await llm.models.list();
    const availableModels = models.data.map((m) => m.id);
    return NextResponse.json({
      reachable: true,
      baseUrl: BASE_URL,
      model: LLM_MODEL,
      modelAvailable: availableModels.includes(LLM_MODEL),
      availableModels,
      latencyMs: Date.now() - start,
    });
  } catch (error) {
    const { code, message } = describeLlmError(error);
    return NextResponse.json({
      reachable: false,
      baseUrl: BASE_URL,
      model: LLM_MODEL,
      code,
      message,
      latencyMs: Date.now() - start,
    });
  }
}
