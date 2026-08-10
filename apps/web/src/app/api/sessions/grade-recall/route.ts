import { NextRequest, NextResponse } from "next/server";
import { getLlmClient } from "@/lib/agents/llm-client";
import { extractJson } from "@/lib/agents/extract-json";

interface GradeBody {
  question?: string;
  answer?: string;
  moduleName?: string;
}

// The Active Recall step used to just save whatever the student typed with no verdict — direct
// user complaint: "tem que me dar o retorno se a resposta está certa ou errada naquele momento".
// This is a real-time LLM judge call (latency + local-model-quality tradeoff, same one already
// accepted for calendar generation / ementa parsing / the Orchestrator chat) rather than a fixed
// answer-key, since there's no stored "correct answer" to diff against — only the question and
// the module it came from.
export async function POST(req: NextRequest) {
  try {
    const { client: llm, model: LLM_MODEL } = getLlmClient();
    const { question, answer, moduleName } = (await req.json()) as GradeBody;
    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json({ error: "missing_input" }, { status: 400 });
    }

    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are grading a student's active-recall answer${moduleName ? ` for the module "${moduleName}"` : ""}.

Question: ${question}
Student's answer: ${answer}

Classify the answer into exactly one of three tiers:
- "correct": demonstrates real understanding. Doesn't need to be word-perfect — a
  partial-but-substantive answer that covers the core idea still counts as correct.
- "partial": shows some genuine understanding or is headed the right direction, but is
  missing a real part of the answer (e.g. mentions the right concept but not how to apply it,
  or gets the general idea but skips a required piece like a formula/constraint/step).
- "incorrect": vague, empty, off-topic, a non-answer ("não sei", filler text), or clearly wrong.

Reply in Brazilian Portuguese, 1-2 short sentences, direct and encouraging either way — for
"partial", name specifically what's missing so the student knows what to add.

Return ONLY this JSON: { "verdict": "correct" | "partial" | "incorrect", "feedback": "string" }`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(extractJson(raw)) as { verdict?: string; feedback?: string };
    if (
      (parsed.verdict !== "correct" && parsed.verdict !== "partial" && parsed.verdict !== "incorrect") ||
      !parsed.feedback
    ) {
      throw new Error("Model returned an unexpected shape");
    }

    return NextResponse.json({ verdict: parsed.verdict, feedback: parsed.feedback });
  } catch (error) {
    console.error("Recall grading failed:", error);
    return NextResponse.json({ error: "grading_unavailable" }, { status: 502 });
  }
}
