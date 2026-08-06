import { describe, expect, it } from "vitest";
import {
  disciplinePatchSchema,
  modulePatchSchema,
  profilePatchSchema,
  sessionCompleteSchema,
} from "./schemas";

// Regression coverage for the mass-assignment fix: local-db.ts's update*() functions
// build `SET column = @column` from Object.keys(updates), so any key that survives
// validation becomes a SQL column reference. .strict() must reject unknown keys.

describe("disciplinePatchSchema", () => {
  it("accepts a valid partial update", () => {
    const result = disciplinePatchSchema.parse({ name: "Cálculo I", horas_semana: 6 });
    expect(result).toEqual({ name: "Cálculo I", horas_semana: 6 });
  });

  it("rejects a key outside the allowlist (e.g. attempting to set id/created_at)", () => {
    expect(() => disciplinePatchSchema.parse({ id: "attacker-controlled", name: "x" })).toThrow();
    expect(() => disciplinePatchSchema.parse({ created_at: "2000-01-01" })).toThrow();
  });

  it("rejects an arbitrary unknown column name", () => {
    expect(() => disciplinePatchSchema.parse({ is_admin: true })).toThrow();
  });
});

describe("profilePatchSchema", () => {
  it("accepts known fields only", () => {
    expect(profilePatchSchema.parse({ name: "Ana", bio: null })).toEqual({ name: "Ana", bio: null });
  });

  it("rejects unexpected keys", () => {
    expect(() => profilePatchSchema.parse({ name: "Ana", id: "local" })).toThrow();
  });
});

describe("modulePatchSchema", () => {
  it("accepts a status transition", () => {
    expect(modulePatchSchema.parse({ status: "done" })).toEqual({ status: "done" });
  });

  it("rejects an invalid status value", () => {
    expect(() => modulePatchSchema.parse({ status: "concluido" })).toThrow();
  });

  it("rejects unexpected keys", () => {
    expect(() => modulePatchSchema.parse({ discipline_id: "other-discipline" })).toThrow();
  });
});

describe("sessionCompleteSchema", () => {
  it("accepts a valid completion payload", () => {
    expect(sessionCompleteSchema.parse({ sessionId: "abc", recallScore: 4 })).toEqual({
      sessionId: "abc",
      recallScore: 4,
    });
  });

  it("rejects an out-of-range recallScore", () => {
    expect(() => sessionCompleteSchema.parse({ sessionId: "abc", recallScore: 9 })).toThrow();
  });
});
