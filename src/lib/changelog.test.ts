import { describe, it, expect } from "vitest";
import { CHANGELOG } from "./changelog";

describe("CHANGELOG", () => {
  it("não está vazio", () => expect(CHANGELOG.length).toBeGreaterThan(0));

  it("cada entrada tem data ISO, título e itens", () => {
    for (const e of CHANGELOG) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.title.length).toBeGreaterThan(0);
      expect(Array.isArray(e.items)).toBe(true);
      expect(e.items.length).toBeGreaterThan(0);
      e.items.forEach((it) => expect(typeof it).toBe("string"));
    }
  });
});
