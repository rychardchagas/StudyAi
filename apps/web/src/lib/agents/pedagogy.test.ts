import { describe, expect, it } from "vitest";
import { selectMethodology } from "./pedagogy";

describe("selectMethodology", () => {
  it("uses Mapas Mentais for a pend module with 4+ topics", () => {
    expect(selectMethodology("pend", null, 0, undefined, 4)).toBe("Mapas Mentais");
    expect(selectMethodology("pend", null, 0, undefined, 6)).toBe("Mapas Mentais");
  });

  it("keeps Prática Deliberada for a pend module with few/no topics", () => {
    expect(selectMethodology("pend", null, 0, undefined, 0)).toBe("Prática Deliberada");
    expect(selectMethodology("pend", null, 0, undefined, 3)).toBe("Prática Deliberada");
  });

  it("cycles prog modules through Active Recall / Feynman / Aprendizagem por Problemas every 4 sessions", () => {
    const results = [0, 1, 2, 3, 4, 5, 6, 7].map((sc) => selectMethodology("prog", null, sc));
    expect(results).toEqual([
      "Active Recall",
      "Active Recall",
      "Feynman",
      "Aprendizagem por Problemas",
      "Active Recall",
      "Active Recall",
      "Feynman",
      "Aprendizagem por Problemas",
    ]);
  });

  it("still prioritizes Active Recall over everything when the exam is close, regardless of topics", () => {
    expect(selectMethodology("pend", 5, 0, undefined, 10)).toBe("Active Recall");
    expect(selectMethodology("prog", 5, 3)).toBe("Active Recall");
  });

  it("keeps done-module logic unchanged by the new parameter", () => {
    expect(selectMethodology("done", null, 0, { lapses: 0, reps: 5 })).toBe("Repetição Espaçada");
    expect(selectMethodology("done", null, 0, { lapses: 3, reps: 5 })).toBe("Prática Deliberada");
  });
});
