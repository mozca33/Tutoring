import { describe, it, expect } from "vitest";
import { teacherHasAccess, trialDaysLeft, isOnTrial } from "./subscription";

const future = new Date(Date.now() + 3 * 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

describe("teacherHasAccess", () => {
  it("aluno sempre tem acesso", () =>
    expect(teacherHasAccess({ role: "student", subscription_status: "none", trial_ends_at: null })).toBe(true));
  it("professor com assinatura ativa", () =>
    expect(teacherHasAccess({ role: "teacher", subscription_status: "active", trial_ends_at: null })).toBe(true));
  it("professor em trial válido", () =>
    expect(teacherHasAccess({ role: "teacher", subscription_status: "trialing", trial_ends_at: future })).toBe(true));
  it("professor com trial vencido → bloqueado", () =>
    expect(teacherHasAccess({ role: "teacher", subscription_status: "trialing", trial_ends_at: past })).toBe(false));
  it("professor sem assinatura → bloqueado", () =>
    expect(teacherHasAccess({ role: "teacher", subscription_status: "none", trial_ends_at: null })).toBe(false));
  it("professor expirado → bloqueado", () =>
    expect(teacherHasAccess({ role: "teacher", subscription_status: "expired", trial_ends_at: past })).toBe(false));
});

describe("trialDaysLeft", () => {
  it("null → 0", () => expect(trialDaysLeft(null)).toBe(0));
  it("data passada → 0", () => expect(trialDaysLeft(past)).toBe(0));
  it("data futura > 0", () => expect(trialDaysLeft(future)).toBeGreaterThan(0));
});

describe("isOnTrial", () => {
  it("professor em trial válido", () =>
    expect(isOnTrial({ role: "teacher", subscription_status: "trialing", trial_ends_at: future })).toBe(true));
  it("aluno nunca está em trial", () =>
    expect(isOnTrial({ role: "student", subscription_status: "trialing", trial_ends_at: future })).toBe(false));
});
