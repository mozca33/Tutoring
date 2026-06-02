// Validações de entrada para autenticação.
// Foco: prevenir dados malformados/abusivos antes de chamar o backend.
// (O Supabase já parametriza queries, então não há risco de SQL injection;
// aqui garantimos formato, limites de tamanho e força de senha.)

export const MAX_EMAIL_LENGTH = 254; // RFC 5321
export const MAX_NAME_LENGTH = 80;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72; // limite do bcrypt usado pelo Supabase

// Validação de e-mail pragmática (não permite espaços, exige um @ e um domínio com ponto).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Detecta caracteres de controle (não imprimíveis) que não devem aparecer em um nome.
function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

export function validateEmail(raw: string): { ok: boolean; value: string; error?: string } {
  const value = raw.trim().toLowerCase();
  if (!value) return { ok: false, value, error: "Informe o e-mail." };
  if (value.length > MAX_EMAIL_LENGTH) return { ok: false, value, error: "E-mail muito longo." };
  if (!EMAIL_RE.test(value)) return { ok: false, value, error: "E-mail inválido." };
  return { ok: true, value };
}

export function validateName(raw: string): { ok: boolean; value: string; error?: string } {
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < 2) return { ok: false, value, error: "Informe seu nome completo." };
  if (value.length > MAX_NAME_LENGTH) return { ok: false, value, error: "Nome muito longo." };
  // Bloqueia tags e caracteres de controle para evitar conteúdo malicioso
  if (/[<>]/.test(value) || hasControlChar(value)) {
    return { ok: false, value, error: "Nome contém caracteres inválidos." };
  }
  return { ok: true, value };
}

export function validatePassword(value: string): { ok: boolean; error?: string } {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.` };
  }
  if (!/[a-z]/.test(value)) return { ok: false, error: "Inclua ao menos uma letra minúscula." };
  if (!/[A-Z]/.test(value)) return { ok: false, error: "Inclua ao menos uma letra maiúscula." };
  if (!/[0-9]/.test(value)) return { ok: false, error: "Inclua ao menos um número." };
  return { ok: true };
}
