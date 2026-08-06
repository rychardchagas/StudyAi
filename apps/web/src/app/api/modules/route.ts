import { NextRequest, NextResponse } from "next/server";
import { createModule } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { moduleCreateSchema } from "@/lib/api/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = moduleCreateSchema.parse(await req.json());
    return NextResponse.json(createModule(body), { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create module");
  }
}
