import { NextRequest, NextResponse } from "next/server";
import { completeSession, createSession, getModule, updateModule, recalculateAllProgress } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { sessionCompleteSchema } from "@/lib/api/schemas";
import { scheduleCard, type FSRSCard, type Rating } from "@/lib/utils/fsrs";

export async function POST(req: NextRequest) {
  try {
    const body = sessionCompleteSchema.parse(await req.json());
    const { moduleId, recallScore, notes, finished } = body;

    const sessionId =
      body.sessionId ??
      createSession({
        discipline_id: body.disciplineId,
        module_id: moduleId,
        scheduled_at: body.scheduledAt,
        duration_minutes: body.durationMinutes,
        methodology: body.methodology,
      }).id;

    completeSession(sessionId, { recallScore, notes });

    if (moduleId) {
      const mod = getModule(moduleId);
      if (mod && finished === false) {
        // "Não terminei — retomar depois": no real recall check happened, so no FSRS update —
        // scoring one would be dishonest data. Just flag the module as the student's current
        // focus (unless it's already "done") so pickModuleForSession's inProg priority
        // (scheduler.ts) hands them the *same* module again next time instead of rotating on.
        if (mod.status !== "done") {
          updateModule(moduleId, { status: "prog" });
          recalculateAllProgress();
        }
      } else if (mod && recallScore) {
        // Actually apply spaced repetition instead of just recording the score: reschedule the
        // module's FSRS card from its current stored state, using the rating the user just gave.
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
          // Completing a session is direct evidence the student started this module — a "pend"
          // module sitting untouched in /disciplines after real study sessions on it was a real
          // reported gap. "done" stays a deliberate manual call (the status-cycle control in
          // DisciplinesClient) rather than inferred here, since one session finishing doesn't
          // mean the whole module is mastered.
          ...(mod.status === "pend" ? { status: "prog" as const } : {}),
        });
        // Keeps disciplines.progress in sync with the module status change above — this used to
        // require a manual "Corrigir progresso" click in Configurações; completing a session is
        // exactly the kind of event that should already reflect there and on /disciplines.
        recalculateAllProgress();
      }
    }

    // TODO: check if streak milestone reached

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to complete session");
  }
}
