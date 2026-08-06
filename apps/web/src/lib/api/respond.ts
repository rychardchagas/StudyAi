import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Central error → HTTP response mapping for the CRUD routes. LLM-calling routes
// (agents, calendar/generate, curriculum/parse) use describeAnthropicError instead —
// their failure modes (no credit, invalid key) don't apply here.
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: "Dados inválidos.",
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
      { status: 400 }
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "invalid_json", message: "Corpo da requisição não é um JSON válido." },
      { status: 400 }
    );
  }
  console.error(`${context}:`, error);
  return NextResponse.json({ error: "internal_error", message: "Erro interno. Tente novamente." }, { status: 500 });
}
