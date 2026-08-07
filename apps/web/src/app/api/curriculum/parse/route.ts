import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import type { ParsedModule } from "@/lib/agents/curriculum";
import { describeLlmError } from "@/lib/agents/llm-error";
import { llm, LLM_MODEL } from "@/lib/agents/llm-client";
import { extractJson } from "@/lib/agents/extract-json";

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  return buffer.toString("utf-8");
}

interface ParsedSyllabus {
  disciplineName: string;
  estimatedWeeklyHours: number;
  modules: ParsedModule[];
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    // Optional now: the Disciplines screen still provides it (user already named the
    // discipline before uploading its ementa); bulk-import from Onboarding doesn't have a name
    // yet, so it's left for the model to infer from the document itself.
    const providedName = String(form.get("disciplineName") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const text = (await extractText(file)).slice(0, 40_000);
    if (!text.trim()) {
      return NextResponse.json({ error: "Não foi possível extrair texto do arquivo" }, { status: 422 });
    }

    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Parse this course syllabus (ementa) and extract structured data.
${providedName ? `The discipline is already named "${providedName}" — use that exact name.` : "Infer the discipline's name from the document itself (title, header, or subject matter)."}

Syllabus:
${text}

Return ONLY this JSON shape:
{
  "disciplineName": "string",
  "estimatedWeeklyHours": number (a reasonable weekly *study* hours estimate for a student taking this course over a semester — not just classroom contact hours; typically 2-8),
  "modules": [{ "name": "string", "estimatedHours": number, "prerequisites": ["string"], "topics": ["string"] }]
}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: ParsedSyllabus;
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch (parseError) {
      console.error("Curriculum parse: could not extract JSON from model output:", raw);
      throw parseError;
    }

    return NextResponse.json({
      disciplineName: providedName || parsed.disciplineName || file.name.replace(/\.[^./]+$/, ""),
      estimatedWeeklyHours: parsed.estimatedWeeklyHours || 4,
      modules: parsed.modules ?? [],
    });
  } catch (error) {
    console.error("Curriculum parse error:", error);
    const { status, code, message } = describeLlmError(error);
    return NextResponse.json({ error: code, message }, { status });
  }
}
