import { test, expect } from "@playwright/test";

// Credenciais de teste (conta semente de professor). Sobrescreva via env em CI.
const EMAIL = process.env.E2E_EMAIL ?? "professor@teste.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "Teste@1234";

test.describe("fluxo autenticado do professor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("E-mail").fill(EMAIL);
    await page.getByPlaceholder("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: /^Entrar$/ }).click();
    await page.waitForURL(/\/app(\/|$)/, { timeout: 15_000 });
  });

  test("login leva ao dashboard (calendário)", async ({ page }) => {
    // O dashboard mostra o calendário com o botão de nova aula e a lista lateral.
    await expect(page.getByRole("heading", { name: /Próximas aulas/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Meus Alunos" }).first()).toBeVisible();
  });

  test("abre o modal de agendar aula (ou mostra paywall se o teste expirou)", async ({ page }) => {
    const novaAula = page.getByRole("button", { name: /Nova aula/i }).first();
    if (await novaAula.isVisible().catch(() => false)) {
      await novaAula.click();
      await expect(page.getByRole("heading", { name: "Nova aula" })).toBeVisible();
      await expect(page.getByPlaceholder(/Revisão de matemática/i)).toBeVisible();
    } else {
      // Conta de teste com período de teste expirado: deve ver o paywall.
      await expect(page.getByRole("link", { name: /Ver planos/i })).toBeVisible();
    }
  });

  test("navega para Meus Alunos e Mensagens", async ({ page }) => {
    await page.getByRole("link", { name: "Meus Alunos" }).click();
    await page.waitForURL(/\/app\/contatos/);
    await expect(page.getByRole("heading", { name: /Meus alunos/i })).toBeVisible();

    await page.getByRole("link", { name: "Mensagens" }).click();
    await page.waitForURL(/\/app\/chat/);
    await expect(page.getByRole("heading", { name: "Mensagens" })).toBeVisible();
  });
});
