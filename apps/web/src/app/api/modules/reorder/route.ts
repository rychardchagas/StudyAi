import { NextRequest, NextResponse } from "next/server";
import { reorderModules } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { moduleReorderSchema } from "@/lib/api/schemas";

export async function POST(req: NextRequest) {
  try {
    const { discipline_id, module_ids } = moduleReorderSchema.parse(await req.json());
    return NextResponse.json(reorderModules(discipline_id, module_ids));
  } catch (error) {
    return handleApiError(error, "Failed to reorder modules");
  }
}
