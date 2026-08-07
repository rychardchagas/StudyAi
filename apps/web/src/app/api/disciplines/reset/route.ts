import { NextResponse } from "next/server";
import { resetAllData } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";

// Deliberately destructive — deletes every discipline/module/session/flashcard/group so the
// user can start a fresh plan. Confirmation happens client-side (SettingsClient); this route
// does not double-check, same as DELETE /api/disciplines/[id].
export async function POST() {
  try {
    return NextResponse.json(resetAllData());
  } catch (error) {
    return handleApiError(error, "Failed to reset data");
  }
}
