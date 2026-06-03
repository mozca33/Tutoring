// Regras de acesso do professor (SaaS com trial).
// Aluno é sempre grátis; professor precisa de trial válido ou assinatura ativa.

export type SubStatus = "none" | "trialing" | "active" | "past_due" | "canceled" | "expired";

export type SubInfo = {
  role: string;
  subscription_status: string;
  trial_ends_at: string | null;
};

/** Professor tem acesso às funções pagas? (agendar, enviar materiais, etc.) */
export function teacherHasAccess(p: SubInfo): boolean {
  if (p.role !== "teacher") return true; // alunos sempre têm acesso
  if (p.subscription_status === "active") return true;
  if (p.subscription_status === "trialing" && p.trial_ends_at) {
    return new Date(p.trial_ends_at).getTime() > Date.now();
  }
  return false;
}

/** Dias restantes do trial (0 se acabou/sem trial). */
export function trialDaysLeft(trial_ends_at: string | null): number {
  if (!trial_ends_at) return 0;
  const ms = new Date(trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function isOnTrial(p: SubInfo): boolean {
  return p.role === "teacher" && p.subscription_status === "trialing" && teacherHasAccess(p);
}
