import { NextRequest, NextResponse } from "next/server";
import { createModule } from "@/lib/db/local-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(createModule(body), { status: 201 });
  } catch (error) {
    console.error("Module create error:", error);
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}
