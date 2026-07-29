import { NextRequest, NextResponse } from "next/server";
import { updateModule } from "@/lib/db/local-db";

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
