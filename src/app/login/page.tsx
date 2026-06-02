"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";
import { validateEmail } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    // Mensagem genérica: não revela se o e-mail existe (anti-enumeração)
    if (error) return setError("E-mail ou senha incorretos.");
    router.push("/app");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-md bg-surface p-8 rounded-xl shadow-sm border border-border space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>
        <input className={inputClass} type="email" placeholder="E-mail" autoComplete="email" maxLength={254}
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputClass} type="password" placeholder="Senha" autoComplete="current-password"
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
