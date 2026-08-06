import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSession(id);
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(session);
  } catch (error) {
    return handleApiError(error, "Failed to fetch session");
  }
}
