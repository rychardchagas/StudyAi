import { NextRequest, NextResponse } from "next/server";
import { createModule, recalculateAllProgress } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { moduleCreateSchema } from "@/lib/api/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = moduleCreateSchema.parse(await req.json());
    const created = createModule(body);
    // A new module always starts "pend" — it only ever grows the denominator, never the
    // numerator, so disciplines.progress is now stale (an overestimate) the moment this module
    // exists. Same reasoning as the status-cycle recalculation in modules/[id]/route.ts.
    recalculateAllProgress();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create module");
  }
}
