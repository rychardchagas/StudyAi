import { NextRequest, NextResponse } from "next/server";
import { deleteDiscipline, updateDiscipline } from "@/lib/db/local-db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    return NextResponse.json(updateDiscipline(id, body));
  } catch (error) {
    return NextResponse.json({ error: "Failed to update discipline" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    deleteDiscipline(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete discipline" }, { status: 500 });
  }
}
