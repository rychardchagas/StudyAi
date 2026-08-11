import { describe, expect, it } from "vitest";
import { sanitizeReply } from "./sanitizeReply";

describe("sanitizeReply", () => {
  it("passes plain natural-language prose through unchanged", () => {
    const text = "Adicionei a matéria Cálculo I com 6 módulos.";
    expect(sanitizeReply(text, [])).toBe(text);
  });

  it("strips a fenced code block", () => {
    const text = 'Pronto.\n\n```json\n{"a":1}\n```';
    expect(sanitizeReply(text, [])).toBe("Pronto.");
  });

  it("strips a paragraph that's nothing but JSON", () => {
    const text = 'Feito!\n\n{"name":"set_fixed_schedule","arguments":{}}';
    expect(sanitizeReply(text, [])).toBe("Feito!");
  });

  it("strips a tool-call JSON blob glued to a hallucinated signature line — the real bug seen live", () => {
    const text =
      "Vou adicionar horários típicos de uma semana na terça-feira (dia 3) e às 15h (hora 03). " +
      "Isso fará suas aulas se repetirem toda semana na mesma hora e dia.\n\n" +
      "Adicionarei os seguintes horários:\n" +
      "- Pesquisa Operacional as 15h\n" +
      "- Estruturas de Dados as 15h\n\n" +
      "Por favor, confirme se estão corretos.\n\n" +
      "Ronaldo\n" +
      '{"name": "set_fixed_schedule", "arguments": {"discipline_name": ["Pesquisa Operacional", "Estruturas de Dados"], "slots": [{"day": "Ter", "time": "15h"}]}}';
    const result = sanitizeReply(text, []);
    expect(result).not.toMatch(/[{}]/);
    expect(result).not.toMatch(/Ronaldo/);
    expect(result).toContain("Por favor, confirme se estão corretos.");
  });

  it("strips a tool-call JSON blob embedded mid-sentence, not just at the end", () => {
    const text = 'Vou fazer isso agora {"name":"add_module","arguments":{"x":1}} e te aviso quando terminar.';
    const result = sanitizeReply(text, []);
    expect(result).not.toMatch(/"name"/);
    expect(result).toContain("Vou fazer isso agora");
    expect(result).toContain("e te aviso quando terminar.");
  });

  it("does not strip legitimate JSON-free prose that happens to end in a short word", () => {
    const text = "Tudo certo por aqui, valeu";
    // no ending punctuation and <=4 words is exactly the signature-line shape — but there's no
    // JSON leak in this message, so nothing should be cut from it beyond what's already there.
    expect(sanitizeReply(text, [])).toBe("Tudo certo por aqui, valeu");
  });

  it("falls back to actionsPerformed when nothing readable survives", () => {
    const text = '{"name":"add_module","arguments":{}}';
    expect(sanitizeReply(text, ["Módulo adicionado."])).toBe("Módulo adicionado.");
  });

  it("falls back to a generic 'Pronto.' when there are no actions either", () => {
    const text = '{"name":"add_module","arguments":{}}';
    expect(sanitizeReply(text, [])).toBe("Pronto.");
  });

  it("does not get confused by braces inside a JSON string value within the leaked blob", () => {
    const text = 'Ok.\n\n{"name":"note","arguments":{"text":"use {curly} braces"}}';
    expect(sanitizeReply(text, [])).toBe("Ok.");
  });
});
