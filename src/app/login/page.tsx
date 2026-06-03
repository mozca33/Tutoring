"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";
import PasswordInput from "@/components/password-input";
import GoogleButton from "@/components/google-button";
import { validateEmail } from "@/lib/validation";
import { authRedirectTo } from "@/lib/auth-redirect";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "nouser" ? "Conta não encontrada. Faça o cadastro primeiro."
      : params.get("error") === "auth" ? "Não foi possível entrar. Tente novamente."
        : null,
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mail = validateEmail(email);
    if (!mail.ok) return setError(mail.error!);
    if (!password) return setError("Informe a senha.");

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: mail.value, password });
    setLoading(false);
    if (error) {
      // Credencial inválida = mensagem genérica (anti-enumeração).
      // Outros erros (servidor/config) mostram o motivo para facilitar diagnóstico.
      if (error.code === "invalid_credentials" || error.status === 400) {
        return setError("E-mail ou senha incorretos.");
      }
      return setError(`Erro ao entrar: ${error.message}`);
    }
    router.push("/app");
    router.refresh();
  }

  async function signInWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirectTo("/app", "login") },
    });
    if (error) { setGoogleLoading(false); setError(error.message); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <form onSubmit={onSubmit} className="w-full max-w-md bg-surface p-8 rounded-xl shadow-sm border border-border space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>

        <GoogleButton onClick={signInWithGoogle} disabled={googleLoading} label={googleLoading ? "Conectando..." : "Entrar com Google"} />
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <input className={inputClass} type="email" placeholder="E-mail" autoComplete="email" maxLength={254}
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordInput className={inputClass} placeholder="Senha" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 transition-colors">
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-sm text-muted text-center">
          Não tem conta? <Link href="/signup" className="text-indigo-600 dark:text-indigo-400">Criar agora</Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
