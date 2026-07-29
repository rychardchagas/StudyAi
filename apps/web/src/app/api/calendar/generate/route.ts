import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { validateCalendar } from "@/lib/agents/qa";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { disciplines, availability, preferences } = await req.json();

    const prompt = `Generate a study calendar for the following week.

Disciplines: ${JSON.stringify(disciplines)}
Available time slots: ${JSON.stringify(availability)}
Preferences: ${JSON.stringify(preferences)}

Apply these rules:
1. Distribute sessions proportionally to weekly hours per discipline
2. Apply interleaving — never schedule the same discipline in consecutive slots of the same day
3. Prioritize disciplines with exams < 14 days away
4. For modules with status "done" → schedule Spaced Repetition review
5. For modules with status "prog" → schedule Active Recall
6. For modules with status "pend" → schedule Deliberate Practice

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

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const calendar = JSON.parse(clean);

    const qa = validateCalendar(calendar.events ?? [], disciplines ?? []);
    if (!qa.valid) {
      console.warn("QA Agent flagged calendar issues:", qa.issues);
    }

    return NextResponse.json({ ...calendar, qa });
  } catch (error) {
    console.error("Calendar generation error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
