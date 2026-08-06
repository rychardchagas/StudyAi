import { NextResponse } from "next/server";
import { recalculateAllProgress } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";

export async function POST() {
  try {
    return NextResponse.json(recalculateAllProgress());
  } catch (error) {
    return handleApiError(error, "Failed to recalculate discipline progress");
  }
}
