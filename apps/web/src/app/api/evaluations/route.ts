import { NextRequest, NextResponse } from "next/server";
import { createEvaluation } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { evaluationCreateSchema } from "@/lib/api/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = evaluationCreateSchema.parse(await req.json());
    return NextResponse.json(createEvaluation(body), { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create evaluation");
  }
}
