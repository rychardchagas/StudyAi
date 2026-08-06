import { NextRequest, NextResponse } from "next/server";
import { deleteModule, updateModule } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { modulePatchSchema } from "@/lib/api/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = modulePatchSchema.parse(await req.json());
    return NextResponse.json(updateModule(id, body));
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
