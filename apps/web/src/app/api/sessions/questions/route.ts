import { NextRequest, NextResponse } from "next/server";
import { getModule } from "@/lib/db/local-db";
import { getLlmClient } from "@/lib/agents/llm-client";
import { extractJson } from "@/lib/agents/extract-json";

interface QuestionsBody {
  moduleId?: string;
  moduleName?: string;
  disciplineName?: string;
}

// Grounds Active Recall questions in the module's actual content instead of a generic template —
// only possible for modules that have `topics` (populated when their ementa was parsed; older
// modules or ones added by hand won't have any). Falls back to a plain "explain this" question
// per topic (still content-specific) if the model call fails, rather than surfacing an error mid-session.
export async function POST(req: NextRequest) {
  try {
    const { client: llm, model: LLM_MODEL } = getLlmClient();
    const { moduleId, moduleName, disciplineName } = (await req.json()) as QuestionsBody;
    const mod = moduleId ? getModule(moduleId) : undefined;
    const name = mod?.name ?? moduleName ?? "este tema";
    const topics = mod?.topics ?? [];

    if (!topics.length) {
      return NextResponse.json({ questions: null });
    }

    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Generate exactly 3 active-recall study questions in Brazilian Portuguese for a
student reviewing the module "${name}"${disciplineName ? ` (discipline: ${disciplineName})` : ""}.
Ground each question in one of these real subtopics from the module's syllabus — don't invent
unrelated content:
${topics.map((t) => `- ${t}`).join("\n")}

Questions should require genuine recall/explanation (not yes/no), in the spirit of active recall
and elaboration (ask "why"/"how"/"give an example", not just "define").

Return ONLY this JSON: { "questions": ["string", "string", "string"] }`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(extractJson(raw)) as { questions?: string[] };
    const questions = (parsed.questions ?? []).filter((q) => q?.trim()).slice(0, 3);

    return NextResponse.json({ questions: questions.length ? questions : null });
  } catch (error) {
    console.error("Session questions generation failed, caller falls back to generic template:", error);
    return NextResponse.json({ questions: null });
  }
}
