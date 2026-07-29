import { NextRequest, NextResponse } from "next/server";
import { createDiscipline, createModule, listDisciplines } from "@/lib/db/local-db";

export async function GET() {
  try {
    return NextResponse.json(listDisciplines());
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch disciplines" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { modules, ...body } = await req.json();
    const discipline = createDiscipline(body);
    if (Array.isArray(modules)) {
      modules.forEach((m: { name: string; estimated_hours?: number }, i: number) =>
        createModule({ discipline_id: discipline.id, name: m.name, estimated_hours: m.estimated_hours, order_index: i })
      );
    }
    return NextResponse.json(listDisciplines().find((d) => d.id === discipline.id), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create discipline" }, { status: 500 });
  }
}
