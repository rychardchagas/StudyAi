import { NextRequest, NextResponse } from "next/server";
import { completeSession, getModule, updateModule } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { sessionCompleteSchema } from "@/lib/api/schemas";
import { scheduleCard, type FSRSCard, type Rating } from "@/lib/utils/fsrs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, moduleId, recallScore, notes } = sessionCompleteSchema.parse(await req.json());

    completeSession(sessionId, { recallScore, notes });

    // Actually apply spaced repetition instead of just recording the score: reschedule the
    // module's FSRS card from its current stored state, using the rating the user just gave.
    // Silently skips if there's no module (free-form sessions) or no rating was given.
    if (moduleId && recallScore) {
      const mod = getModule(moduleId);
      if (mod) {
        const card: FSRSCard = {
          stability: mod.fsrs_stability,
          difficulty: mod.fsrs_difficulty,
          dueDate: mod.fsrs_due_date ? new Date(mod.fsrs_due_date) : new Date(),
          reps: mod.fsrs_reps,
          lapses: mod.fsrs_lapses,
          state: mod.fsrs_state,
        };
        const rescheduled = scheduleCard(card, recallScore as Rating);
        updateModule(moduleId, {
          fsrs_stability: rescheduled.stability,
          fsrs_difficulty: rescheduled.difficulty,
          fsrs_due_date: rescheduled.dueDate.toISOString(),
          fsrs_reps: rescheduled.reps,
          fsrs_lapses: rescheduled.lapses,
          fsrs_state: rescheduled.state,
        });
      }
    }

    // TODO: check if streak milestone reached

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to complete session");
  }
}
