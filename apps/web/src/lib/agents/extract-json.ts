// Local models (and Claude, occasionally) don't reliably return *only* the requested JSON —
// markdown fences, or a trailing sentence after the object, are common enough that a bare
// JSON.parse(text) on the raw completion is fragile. This scans for the first balanced
// {...}/[...] block (string-literal-aware, so braces inside a JSON string value don't throw off
// the depth count) and returns just that — ignoring anything the model said before or after it.
export function extractJson(text: string): string {
  let begin = -1;
  for (const opener of ["{", "["]) {
    const idx = text.indexOf(opener);
    if (idx !== -1 && (begin === -1 || idx < begin)) begin = idx;
  }
  if (begin === -1) throw new SyntaxError("No JSON object or array found in model output");

  const openChar = text[begin];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = begin; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === openChar) {
      depth++;
    } else if (c === closeChar) {
      depth--;
      if (depth === 0) return text.slice(begin, i + 1);
    }
  }
  throw new SyntaxError("Unbalanced JSON in model output");
}
