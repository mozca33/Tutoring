// URL de retorno para confirmação de e-mail e OAuth.
// Usa a origem atual (funciona em localhost e em produção) e aponta para a
// rota de callback que troca o código pela sessão.
export function authRedirectTo(next: string = "/app"): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
