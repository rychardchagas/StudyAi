import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ORCHESTRATOR_PROMPT = `You are StudyAI's Orchestrator — an intelligent study planning assistant.
You help students manage their study calendars using evidence-based learning techniques:
- Spaced Repetition (FSRS algorithm)
- Interleaving (mixing subjects strategically)
- Active Recall (testing without looking)
- Deliberate Practice (working at the edge of competence)

You have access to the student's disciplines, modules, schedule and progress.
Always respond in Brazilian Portuguese. Be direct, encouraging, and data-driven.
When suggesting schedule changes, explain the pedagogical reasoning.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: ORCHESTRATOR_PROMPT + (context ? `\n\nStudent context:\n${JSON.stringify(context, null, 2)}` : ""),
      messages,
    });

    return NextResponse.json({
      content: response.content[0].type === "text" ? response.content[0].text : "",
      usage: response.usage,
    });
  } catch (error) {
    console.error("Orchestrator error:", error);
    return NextResponse.json({ error: "Agent error" }, { status: 500 });
  }
}
