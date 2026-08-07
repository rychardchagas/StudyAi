import { NextRequest, NextResponse } from "next/server";
import { deleteEvaluation, updateEvaluation } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { evaluationPatchSchema } from "@/lib/api/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = evaluationPatchSchema.parse(await req.json());
    return NextResponse.json(updateEvaluation(id, body));
  } catch (error) {
    return handleApiError(error, "Failed to update evaluation");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    deleteEvaluation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete evaluation");
  }
}
