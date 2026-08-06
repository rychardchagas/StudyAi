import { NextRequest, NextResponse } from "next/server";
import { createDiscipline, createModule, listDisciplines } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { disciplineCreateSchema } from "@/lib/api/schemas";

export async function GET() {
  try {
    return NextResponse.json(listDisciplines());
  } catch (error) {
    return handleApiError(error, "Failed to fetch disciplines");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { modules, ...body } = disciplineCreateSchema.parse(await req.json());
    const discipline = createDiscipline(body);
    modules?.forEach((m, i) =>
      createModule({ discipline_id: discipline.id, name: m.name, estimated_hours: m.estimated_hours, order_index: i })
    );
    return NextResponse.json(listDisciplines().find((d) => d.id === discipline.id), { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create discipline");
  }
}
