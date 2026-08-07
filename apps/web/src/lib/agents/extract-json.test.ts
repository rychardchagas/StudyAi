import { describe, expect, it } from "vitest";
import { extractJson } from "./extract-json";

describe("extractJson", () => {
  it("returns clean JSON unchanged", () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}');
  });

  it("strips markdown code fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("ignores trailing prose after a valid object — the actual bug this guards against", () => {
    const text = '{"events":[{"a":1}]}\n\nLet me know if you need any adjustments to this schedule!';
    expect(extractJson(text)).toBe('{"events":[{"a":1}]}');
  });

  it("ignores leading prose before a valid object", () => {
    const text = 'Here is your calendar:\n{"events":[]}';
    expect(extractJson(text)).toBe('{"events":[]}');
  });

  it("handles nested objects and arrays without stopping at an inner closing brace", () => {
    const text = '{"events":[{"day":0,"tags":["a","b"]},{"day":1,"tags":[]}]}';
    expect(extractJson(text)).toBe(text);
  });

  it("does not get confused by braces inside string values", () => {
    const text = '{"note":"use {curly} braces carefully"}';
    expect(extractJson(text)).toBe(text);
  });

  it("extracts a top-level array when that's what the model returned", () => {
    const text = 'Sure!\n[{"name":"Mod 1"},{"name":"Mod 2"}]\nHope that helps.';
    expect(extractJson(text)).toBe('[{"name":"Mod 1"},{"name":"Mod 2"}]');
  });

  it("throws a clear error when there's no JSON at all", () => {
    expect(() => extractJson("Sorry, I can't help with that.")).toThrow(/No JSON/);
  });

  it("throws when braces never balance", () => {
    expect(() => extractJson('{"events": [')).toThrow(/Unbalanced/);
  });
});
