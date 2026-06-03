// URL de retorno para confirmação de e-mail e OAuth.
// `intent` distingue login (não deve criar conta) de signup.
export function authRedirectTo(next: string = "/app", intent?: "login" | "signup"): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";
  const params = new URLSearchParams({ next });
  if (intent) params.set("intent", intent);
  return `${base}/auth/callback?${params.toString()}`;
}
