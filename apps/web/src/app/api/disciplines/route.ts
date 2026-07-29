import { NextRequest, NextResponse } from "next/server";
import { createDiscipline, listDisciplines } from "@/lib/db/local-db";

export async function GET() {
  try {
    return NextResponse.json(listDisciplines());
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch disciplines" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(createDiscipline(body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create discipline" }, { status: 500 });
  }
}
