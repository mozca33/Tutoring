import { test, expect } from "@playwright/test";

test("landing carrega com título e CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Aulas particulares/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Criar conta/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Entrar$/ })).toBeVisible();
});

test("login mostra formulário", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByPlaceholder("E-mail")).toBeVisible();
  await expect(page.getByRole("button", { name: /Entrar com Google/i })).toBeVisible();
});

test("signup é só para professor", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByText(/conta de professor/i)).toBeVisible();
  await expect(page.getByText(/criada pelo seu professor/i)).toBeVisible();
});

test("área logada redireciona para login sem sessão", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
});

test("credencial inválida mostra erro", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill("naoexiste@exemplo.com");
  await page.getByPlaceholder("Senha").fill("Senha@123");
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await expect(page.getByText(/incorret/i)).toBeVisible();
});
