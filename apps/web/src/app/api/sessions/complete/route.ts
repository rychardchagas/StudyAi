import { NextRequest, NextResponse } from "next/server";
import { completeSession } from "@/lib/db/local-db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, recallScore, notes } = await req.json();

    completeSession(sessionId, { recallScore, notes });

    // TODO: trigger FSRS update via Progress Agent
    // TODO: check if streak milestone reached

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session complete error:", error);
    return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
  }
}
