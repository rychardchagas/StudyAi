import { NextRequest, NextResponse } from "next/server";
import { createPomodoroRound, listPomodoroRounds } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { pomodoroRoundCreateSchema } from "@/lib/api/schemas";

export async function GET() {
  try {
    return NextResponse.json(listPomodoroRounds());
  } catch (error) {
    return handleApiError(error, "Failed to list pomodoro rounds");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = pomodoroRoundCreateSchema.parse(await req.json());
    return NextResponse.json(createPomodoroRound(body), { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to log pomodoro round");
  }
}
