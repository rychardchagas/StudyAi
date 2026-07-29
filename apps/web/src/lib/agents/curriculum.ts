/**
 * Curriculum Agent
 * Parses syllabi, organizes modules, estimates cognitive load
 */

export interface ParsedModule {
  name: string;
  estimatedHours: number;
  prerequisites: string[];
  topics: string[];
}

export async function parseSyllabus(text: string, disciplineName: string): Promise<ParsedModule[]> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{
        role: "user",
        content: `Parse this syllabus for "${disciplineName}" and extract modules.
        
Syllabus:
${text}

Return ONLY JSON array:
[{ "name": "string", "estimatedHours": number, "prerequisites": ["string"], "topics": ["string"] }]`,
      }],
    }),
  });

  const data = await res.json();
  const clean = data.content.replace(/\`\`\`json|\`\`\`/g, "").trim();
  return JSON.parse(clean);
}
