import { NextRequest, NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/db/local-db";

export async function GET() {
  try {
    return NextResponse.json(listSessions());
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(createSession(body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
