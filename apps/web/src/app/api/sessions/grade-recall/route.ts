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

Judge whether the answer demonstrates real understanding — it doesn't need to be word-perfect,
partial-but-substantive answers count as correct. A vague, empty, or clearly wrong answer is
incorrect. Reply in Brazilian Portuguese, 1-2 short sentences, direct and encouraging either way.

Return ONLY this JSON: { "correct": boolean, "feedback": "string" }`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(extractJson(raw)) as { correct?: boolean; feedback?: string };
    if (typeof parsed.correct !== "boolean" || !parsed.feedback) {
      throw new Error("Model returned an unexpected shape");
    }

    return NextResponse.json({ correct: parsed.correct, feedback: parsed.feedback });
  } catch (error) {
    console.error("Recall grading failed:", error);
    return NextResponse.json({ error: "grading_unavailable" }, { status: 502 });
  }
}
