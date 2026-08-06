import { NextRequest, NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { sessionCreateSchema } from "@/lib/api/schemas";

export async function GET() {
  try {
    return NextResponse.json(listSessions());
  } catch (error) {
    return handleApiError(error, "Failed to fetch sessions");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = sessionCreateSchema.parse(await req.json());
    return NextResponse.json(createSession(body), { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create session");
  }
}
