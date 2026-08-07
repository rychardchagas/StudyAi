import { NextRequest, NextResponse } from "next/server";
import { deleteModule, updateModule, recalculateAllProgress } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { modulePatchSchema } from "@/lib/api/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = modulePatchSchema.parse(await req.json());
    const updated = updateModule(id, body);
    // Marking a module done/pending here (the status-cycle click on /disciplines) is a second,
    // separate path to changing module status besides completing a session — it needs the same
    // discipline.progress recalculation, or the click visibly does nothing anywhere in the app.
    if ("status" in body) recalculateAllProgress();
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, "Failed to update module");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    deleteModule(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete module");
  }
}
