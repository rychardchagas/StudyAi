import { describe, expect, it } from "vitest";
import { detectPreferredPeriods, applyPeriodToSlots } from "./timePreference";

describe("detectPreferredPeriods", () => {
  it("detects a night preference stated in Portuguese", () => {
    const found = detectPreferredPeriods("Engenharia de Software, prefiro estudar a noite por conta da rotina.");
    expect(found.map((f) => f.period)).toEqual(["noite"]);
    expect(found[0].hourRange).toBe("18h–21h");
  });

  it("detects morning and afternoon phrasing variants", () => {
    expect(detectPreferredPeriods("só consigo de manhã").map((f) => f.period)).toEqual(["manhã"]);
    expect(detectPreferredPeriods("prefiro período matinal").map((f) => f.period)).toEqual(["manhã"]);
    expect(detectPreferredPeriods("costumo estudar à tarde").map((f) => f.period)).toEqual(["tarde"]);
  });

  it("can detect more than one period in the same text", () => {
    const found = detectPreferredPeriods("estudo de manhã e também à noite, nunca à tarde");
    expect(new Set(found.map((f) => f.period))).toEqual(new Set(["manhã", "noite", "tarde"]));
  });

  it("returns nothing for empty or unrelated text", () => {
    expect(detectPreferredPeriods("")).toEqual([]);
    expect(detectPreferredPeriods("Engenharia de Software, gosto de café.")).toEqual([]);
  });
});

describe("applyPeriodToSlots", () => {
  it("marks the period's slot range on weekdays only, preserving existing slots", () => {
    const initial = { "5-2": true, "0-2": true }; // Saturday + an unrelated Monday slot
    const result = applyPeriodToSlots(initial, [12, 15]); // noite range
    expect(result["5-2"]).toBe(true); // untouched weekend slot survives
    expect(result["0-2"]).toBe(true); // untouched unrelated slot survives
    for (let day = 0; day < 5; day++) {
      for (let si = 12; si <= 15; si++) {
        expect(result[`${day}-${si}`]).toBe(true);
      }
    }
    // Weekend days should NOT get the period auto-applied.
    expect(result["5-12"]).toBeUndefined();
    expect(result["6-12"]).toBeUndefined();
  });
});
