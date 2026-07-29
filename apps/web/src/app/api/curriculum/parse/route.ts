import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import type { ParsedModule } from "@/lib/agents/curriculum";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  return buffer.toString("utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const disciplineName = String(form.get("disciplineName") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const text = (await extractText(file)).slice(0, 40_000);
    if (!text.trim()) {
      return NextResponse.json({ error: "Não foi possível extrair texto do arquivo" }, { status: 422 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Parse this syllabus for "${disciplineName}" and extract modules.

Syllabus:
${text}

Return ONLY JSON array:
[{ "name": "string", "estimatedHours": number, "prerequisites": ["string"], "topics": ["string"] }]`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const modules: ParsedModule[] = JSON.parse(clean);

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Curriculum parse error:", error);
    return NextResponse.json({ error: "Falha ao processar o arquivo" }, { status: 500 });
  }
}
