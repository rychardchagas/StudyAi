import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { executeTool, TOOLS } from "@/lib/agents/tools";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ORCHESTRATOR_PROMPT = `You are StudyAI's Orchestrator — an intelligent study planning assistant.
You help students manage their study calendars using evidence-based learning techniques:
- Spaced Repetition (FSRS algorithm)
- Interleaving (mixing subjects strategically)
- Active Recall (testing without looking)
- Deliberate Practice (working at the edge of competence)

You have access to the student's disciplines, modules, schedule and progress, and you can use tools to
actually add/edit/remove disciplines and modules, fix a recurring weekly class time, and change availability
— don't just describe what the student should do, do it when they ask. Confirm briefly what you changed.
Always respond in Brazilian Portuguese. Be direct, encouraging, and data-driven.
When suggesting schedule changes, explain the pedagogical reasoning.`;

const MAX_TOOL_ITERATIONS = 5;

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();
    const conversation: Anthropic.MessageParam[] = [...messages];
    const actionsPerformed: string[] = [];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1536,
        system: ORCHESTRATOR_PROMPT + (context ? `\n\nStudent context:\n${JSON.stringify(context, null, 2)}` : ""),
        tools: TOOLS,
        messages: conversation,
      });

      if (response.stop_reason !== "tool_use") {
        const textBlock = response.content.find((b) => b.type === "text");
        return NextResponse.json({
          content: textBlock?.type === "text" ? textBlock.text : "",
          actionsPerformed,
          usage: response.usage,
        });
      }

      conversation.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        try {
          const { result, changed } = executeTool(block.name, block.input as Record<string, unknown>);
          if (changed) actionsPerformed.push(result);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        } catch (error) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: error instanceof Error ? error.message : "Erro ao executar ferramenta",
            is_error: true,
          });
        }
      }
      conversation.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      content: "Não consegui concluir a ação em tempo — tente reformular o pedido.",
      actionsPerformed,
    });
  } catch (error) {
    console.error("Orchestrator error:", error);
    return NextResponse.json({ error: "Agent error" }, { status: 500 });
  }
}
