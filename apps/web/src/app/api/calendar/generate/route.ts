import { NextRequest, NextResponse } from "next/server";
import { validateCalendar } from "@/lib/agents/qa";
import { describeLlmError } from "@/lib/agents/llm-error";
import { llm, LLM_MODEL } from "@/lib/agents/llm-client";
import { extractJson } from "@/lib/agents/extract-json";
import type { CalendarEvent } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { disciplines, availability, preferences, studentContext } = await req.json();

    const prompt = `Generate a study calendar for the following week.

Disciplines (each module includes its real FSRS state — fsrs_stability, fsrs_difficulty,
fsrs_due_date, fsrs_reps, fsrs_lapses, fsrs_state, computed by an actual spaced-repetition
algorithm from the student's real recall performance, not a placeholder):
${JSON.stringify(disciplines)}
Available time slots: ${JSON.stringify(availability)}
Preferences: ${JSON.stringify(preferences)}
${studentContext ? `Student context (from their profile, use this to judge what they actually need — a stated weakness or preference should influence which methodology and which modules you prioritize): ${studentContext}` : ""}

Apply these rules, in order of precedence:
1. Distribute sessions proportionally to weekly hours per discipline.
2. Apply interleaving — never schedule the same discipline in consecutive slots of the same day.
3. Prioritize disciplines with exams < 14 days away — Active Recall regardless of module status.
4. For "done" modules, judge from the real FSRS fields instead of just the status label:
   - If fsrs_due_date is today or earlier, it's genuinely due — prioritize it for a review slot
     over "done" modules that aren't due yet.
   - If fsrs_lapses / fsrs_reps > 0.4 (roughly: failing recall more than 2 times in 5), or
     fsrs_state is "relearning", passive review isn't working for this module — use Prática
     Deliberada (active problem-solving) instead of Repetição Espaçada, since simply re-showing
     the material clearly isn't enough for this student on this module.
   - Otherwise → Repetição Espaçada.
5. For modules with status "prog" → schedule Active Recall (or Feynman occasionally, to vary it).
6. For modules with status "pend" → schedule Prática Deliberada.
7. If student context is present, let it override a borderline call between two reasonable
   methodologies — it's a direct signal from the student about what they need, weigh it seriously.

Return ONLY valid JSON in this format:
{
  "events": [
    {
      "disciplineId": "string",
      "moduleId": "string",
      "moduleName": "string",
      "dayOfWeek": 0-6,
      "slotIndex": 0-15,
      "methodology": "Repetição Espaçada|Active Recall|Prática Deliberada|Interleaving",
      "durationMinutes": 45
    }
  ]
}`;

    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    let calendar: { events?: CalendarEvent[] };
    try {
      calendar = JSON.parse(extractJson(text));
    } catch (parseError) {
      // Smaller local models don't reliably emit *only* the JSON — trailing commentary after a
      // valid object is common. Log the raw text so a real failure (not just noisy prose) is
      // diagnosable instead of a bare "Unexpected token" with no context.
      console.error("Calendar generation: could not extract JSON from model output:", text);
      throw parseError;
    }

    const qa = validateCalendar(calendar.events ?? [], disciplines ?? []);
    if (!qa.valid) {
      console.warn("QA Agent flagged calendar issues:", qa.issues);
    }

    return NextResponse.json({ ...calendar, qa });
  } catch (error) {
    console.error("Calendar generation error:", error);
    const { status, code, message } = describeLlmError(error);
    return NextResponse.json({ error: code, message }, { status });
  }
}
