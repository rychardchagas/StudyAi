import { NextRequest, NextResponse } from "next/server";
import { deleteModule, updateModule } from "@/lib/db/local-db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    return NextResponse.json(updateModule(id, body));
  } catch (error) {
    console.error("Module update error:", error);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    deleteModule(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Module delete error:", error);
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 });
  }
}
