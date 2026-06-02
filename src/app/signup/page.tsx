"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";
import { validateEmail, validateName, validatePassword, MIN_PASSWORD_LENGTH } from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = validateName(fullName);
    if (!name.ok) return setError(name.error!);
    const mail = validateEmail(email);
    if (!mail.ok) return setError(mail.error!);
    const pass = validatePassword(password);
    if (!pass.ok) return setError(pass.error!);

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: mail.value,
      password,
      options: { data: { full_name: name.value, role } },
    });
    setLoading(false);
    if (error) return setError(error.message);
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
        <h1 className="text-2xl font-semibold text-foreground">Criar conta</h1>

        <div className="flex gap-2">
          <button type="button" onClick={() => setRole("student")}
            className={`flex-1 py-2 rounded-lg border ${role === "student" ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border text-foreground"}`}>
            Sou aluno
          </button>
          <button type="button" onClick={() => setRole("teacher")}
            className={`flex-1 py-2 rounded-lg border ${role === "teacher" ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border text-foreground"}`}>
            Sou professor
          </button>
        </div>

        <input className={inputClass} placeholder="Nome completo" autoComplete="name" maxLength={80}
          value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className={inputClass} type="email" placeholder="E-mail" autoComplete="email" maxLength={254}
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputClass} type="password" placeholder={`Senha (mín. ${MIN_PASSWORD_LENGTH})`} autoComplete="new-password" maxLength={72}
          value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} />

        <p className="text-xs text-muted">
          A senha deve ter ao menos {MIN_PASSWORD_LENGTH} caracteres, com maiúscula, minúscula e número.
        </p>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 transition-colors">
          {loading ? "Criando..." : "Criar conta"}
        </button>
        <p className="text-sm text-muted text-center">
          Já tem conta? <Link href="/login" className="text-indigo-600 dark:text-indigo-400">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
