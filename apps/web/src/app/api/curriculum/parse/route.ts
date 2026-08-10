import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import type { ParsedModule } from "@/lib/agents/curriculum";
import { describeLlmError } from "@/lib/agents/llm-error";
import { getLlmClient } from "@/lib/agents/llm-client";
import { extractJson } from "@/lib/agents/extract-json";

// The 40_000-char slice below only caps the *extracted* text — a huge upload still pays the full
// cost of buffering + pdf-parse before that ever kicks in. Low severity for a local single-user
// app (worst case is the user hanging their own request), but cheap to bound properly and matters
// more if this route is ever reachable beyond localhost.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB — generous for a syllabus, not for arbitrary files

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  // .docx is a zip archive of XML, not plain text — the old fallback below (raw utf-8 decode)
  // silently produced binary garbage for it instead of ever erroring, so "Word" support never
  // actually worked despite being implied. mammoth reads the real document.xml inside.
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  return buffer.toString("utf-8");
}

interface ParsedSyllabus {
  disciplineName: string;
  estimatedWeeklyHours: number;
  modules: ParsedModule[];
}

// PDFs with a table-style layout (title in one column, hours in another) often come out of
// pdf-parse with the columns interleaved or flattened — seen live where a real ementa produced
// modules named "18", "12", "15"... (the hours column) instead of the actual titles. Rather than
// surface that confusing garbage in the UI, replace anything that's just a number (with an
// optional "h"/"horas" suffix) with a generic placeholder the student can rename in Step 3.
const NUMERIC_ONLY_NAME = /^\d+([.,]\d+)?\s*(h|hrs?|horas?)?$/i;

function sanitizeModules(modules: ParsedModule[] | undefined): ParsedModule[] {
  return (modules ?? []).map((m, i) => {
    const trimmed = (m.name ?? "").trim();
    return trimmed && !NUMERIC_ONLY_NAME.test(trimmed) ? { ...m, name: trimmed } : { ...m, name: `Módulo ${i + 1}` };
  });
}

export async function POST(req: NextRequest) {
  try {
    const { client: llm, model: LLM_MODEL } = getLlmClient();
    const form = await req.formData();
    const file = form.get("file");
    // Optional now: the Disciplines screen still provides it (user already named the
    // discipline before uploading its ementa); bulk-import from Onboarding doesn't have a name
    // yet, so it's left for the model to infer from the document itself.
    const providedName = String(form.get("disciplineName") ?? "").trim();
    // Optional student-supplied hint about how *this specific* document marks module boundaries
    // (e.g. "Unidade", "Capítulo") — some ementas use unusual headers the generic prompt rules
    // below won't anticipate. Treated as data, not instruction (quoted/labeled, same pattern as
    // providedName/studentContext elsewhere) — this route has no tool-calling surface to hijack,
    // but there's no reason to concatenate untrusted text as if it were a directive regardless.
    const moduleKeywords = String(form.get("moduleKeywords") ?? "").trim().slice(0, 300);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Arquivo muito grande (máx. ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)` },
        { status: 413 }
      );
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

Brazilian ementas almost always mark each module/unit with a recognizable structural header —
look for these to correctly identify where one module ends and the next begins, especially if
table columns or a two-column layout got flattened/scrambled during text extraction:
- "Unidade N", "Módulo N", "Capítulo N", "Bloco N", "Semana N", "Tópico N"
- A numbered outline: "1. TITLE" followed by sub-items "1.1", "1.2" (the top-level numbers are
  usually the real modules; the sub-items are that module's topics, not separate modules)
- A table row where a title-like phrase sits next to a small number (that number is the module's
  hour count, NOT its name — never use it as "name")
${moduleKeywords ? `The student says this specific document marks each module with: "${moduleKeywords}" — treat that as the primary signal for module boundaries, above the generic patterns listed above.` : ""}

Syllabus:
${text}

Return ONLY this JSON shape:
{
  "disciplineName": "string",
  "estimatedWeeklyHours": number (a reasonable weekly *study* hours estimate for a student taking this course over a semester — not just classroom contact hours; typically 2-8),
  "modules": [{ "name": "string", "estimatedHours": number, "prerequisites": ["string"], "topics": ["string"] }]
}
Each module's "name" MUST be its descriptive title (e.g. "Virtualização e Containers") — NEVER
just a number or the hour count. If the source document's layout makes a module's real title
unclear (garbled table columns, OCR noise), still put your best-guess title in "name", not a
number.`,
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
      modules: sanitizeModules(parsed.modules),
    });
  } catch (error) {
    console.error("Curriculum parse error:", error);
    const { status, code, message } = describeLlmError(error);
    return NextResponse.json({ error: code, message }, { status });
  }
}
