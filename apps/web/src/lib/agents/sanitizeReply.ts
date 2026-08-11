// Finds the end of a balanced {...} block starting at `start` (string-literal aware — mirrors
// extractJson's brace counting so a brace inside a JSON string value doesn't throw off the
// depth count). Returns the index just past the matching close brace, or -1 if it never balances.
function findBalancedObjectEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

// A small local model can write out what a tool call *would* look like as part of its visible
// reply instead of actually invoking one (finish_reason stays "stop", so the Orchestrator's tool
// loop never sees it as a real call) — seen live as a tool-call-shaped JSON object glued directly
// into an otherwise normal sentence, not isolated on its own line. Scans for any balanced {...}
// block that carries both a "name" and an "arguments" key — that combination is specific enough
// to real tool-call JSON that legitimate Portuguese prose never produces it — and cuts it out.
function stripEmbeddedToolCallJson(text: string): string {
  let result = "";
  let i = 0;
  while (i < text.length) {
    const brace = text.indexOf("{", i);
    if (brace === -1) {
      result += text.slice(i);
      break;
    }
    const end = findBalancedObjectEnd(text, brace);
    if (end === -1) {
      result += text.slice(i);
      break;
    }
    const block = text.slice(brace, end);
    result += text.slice(i, /"name"\s*:/.test(block) && /"arguments"\s*:/.test(block) ? brace : end);
    i = end;
  }
  return result;
}

// Defense in depth alongside the Orchestrator's system-prompt instruction not to leak tool-call
// syntax: strips fenced code blocks, any embedded tool-call-shaped JSON (see above), a hallucinated
// bare "signature" line the model sometimes leaves right where the JSON used to be (e.g. a stray
// name with no sentence punctuation), and any paragraph that's nothing but a JSON object/array —
// falling back to the (already clean, hand-written) actionsPerformed summaries when nothing
// readable survives.
export function sanitizeReply(content: string, actionsPerformed: string[]): string {
  const withoutFences = content.replace(/```[\s\S]*?```/g, "");
  const withoutToolCallJson = stripEmbeddedToolCallJson(withoutFences);
  let text = withoutToolCallJson.trim();

  // Only touch the trailing line when a JSON blob was actually excised above — otherwise this
  // would just as happily eat a legitimate short final sentence that doesn't end in punctuation.
  if (withoutToolCallJson.length !== withoutFences.length) {
    const lines = text.split("\n");
    const lastLine = lines[lines.length - 1]?.trim() ?? "";
    if (
      lastLine &&
      lastLine.split(/\s+/).length <= 4 &&
      /^[\wÀ-ÿ ]+$/.test(lastLine) &&
      !/[.!?:]$/.test(lastLine)
    ) {
      lines.pop();
      text = lines.join("\n").trim();
    }
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !(/^[[{][\s\S]*[\]}]$/.test(p)));
  const cleaned = paragraphs.join("\n\n").trim();
  if (cleaned) return cleaned;
  if (actionsPerformed.length) return actionsPerformed.join(" ");
  return "Pronto.";
}
