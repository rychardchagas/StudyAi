import { NextRequest, NextResponse } from "next/server";
import { completeSession } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { sessionCompleteSchema } from "@/lib/api/schemas";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, recallScore, notes } = sessionCompleteSchema.parse(await req.json());

    completeSession(sessionId, { recallScore, notes });

    // TODO: trigger FSRS update via Progress Agent
    // TODO: check if streak milestone reached

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to complete session");
  }
}
