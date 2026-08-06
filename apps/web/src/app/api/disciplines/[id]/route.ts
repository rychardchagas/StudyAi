import { NextRequest, NextResponse } from "next/server";
import { deleteDiscipline, updateDiscipline } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { disciplinePatchSchema } from "@/lib/api/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = disciplinePatchSchema.parse(await req.json());
    return NextResponse.json(updateDiscipline(id, body));
  } catch (error) {
    return handleApiError(error, "Failed to update discipline");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    deleteDiscipline(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete discipline");
  }
}
