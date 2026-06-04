import { describe, it, expect } from "vitest";
import { validateEmail, validateName, validatePassword, MIN_PASSWORD_LENGTH } from "./validation";

describe("validateEmail", () => {
  it("aceita e normaliza (trim + lowercase)", () => {
    const r = validateEmail("  Foo@Bar.COM ");
    expect(r.ok).toBe(true);
    expect(r.value).toBe("foo@bar.com");
  });
  it("rejeita vazio", () => expect(validateEmail("").ok).toBe(false));
  it("rejeita sem @", () => expect(validateEmail("foobar.com").ok).toBe(false));
  it("rejeita com espaço interno", () => expect(validateEmail("a b@c.com").ok).toBe(false));
  it("rejeita sem domínio com ponto", () => expect(validateEmail("a@b").ok).toBe(false));
  it("rejeita muito longo", () => expect(validateEmail("a".repeat(250) + "@b.com").ok).toBe(false));
});

describe("validateName", () => {
  it("aceita e colapsa espaços", () => {
    const r = validateName("  João   Silva  ");
    expect(r.ok).toBe(true);
    expect(r.value).toBe("João Silva");
  });
  it("rejeita curto demais", () => expect(validateName("a").ok).toBe(false));
  it("rejeita tags HTML", () => expect(validateName("<script>").ok).toBe(false));
  it("rejeita caractere de controle", () => expect(validateName("ab" + String.fromCharCode(0) + "cd").ok).toBe(false));
  it("rejeita acima de 80 chars", () => expect(validateName("a".repeat(81)).ok).toBe(false));
});

describe("validatePassword", () => {
  it("aceita senha forte", () => expect(validatePassword("Abcdef1g").ok).toBe(true));
  it("rejeita curta", () => expect(validatePassword("Ab1").ok).toBe(false));
  it("rejeita sem maiúscula", () => expect(validatePassword("abcdef1g").ok).toBe(false));
  it("rejeita sem minúscula", () => expect(validatePassword("ABCDEF1G").ok).toBe(false));
  it("rejeita sem número", () => expect(validatePassword("Abcdefgh").ok).toBe(false));
  it("rejeita longa demais (>72)", () => expect(validatePassword("Aa1" + "x".repeat(80)).ok).toBe(false));
  it("MIN_PASSWORD_LENGTH = 8", () => expect(MIN_PASSWORD_LENGTH).toBe(8));
});
