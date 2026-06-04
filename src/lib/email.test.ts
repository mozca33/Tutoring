import { describe, it, expect } from "vitest";
import { emailLayout } from "./email";

describe("emailLayout", () => {
  it("inclui título e corpo", () => {
    const html = emailLayout("Bem-vindo", "<b>corpo</b>");
    expect(html).toContain("Bem-vindo");
    expect(html).toContain("corpo");
  });
  it("inclui botão de CTA quando fornecido", () => {
    const html = emailLayout("T", "B", "Ver aula", "https://exemplo.com/aula");
    expect(html).toContain("Ver aula");
    expect(html).toContain("https://exemplo.com/aula");
  });
  it("não inclui link quando não há CTA", () => {
    const html = emailLayout("T", "B");
    expect(html).not.toContain("<a ");
  });
});
