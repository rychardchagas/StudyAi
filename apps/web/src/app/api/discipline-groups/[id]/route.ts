import { NextRequest, NextResponse } from "next/server";
import { deleteGroup, updateGroup } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { groupPatchSchema } from "@/lib/api/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = groupPatchSchema.parse(await req.json());
    return NextResponse.json(updateGroup(id, body));
  } catch (error) {
    return handleApiError(error, "Failed to update discipline group");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    deleteGroup(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete discipline group");
  }
}
