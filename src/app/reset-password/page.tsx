"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";
import PasswordInput from "@/components/password-input";
import { validatePassword, MIN_PASSWORD_LENGTH } from "@/lib/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pass = validatePassword(password);
    if (!pass.ok) return setError(pass.error!);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError("Não foi possível definir a senha. Abra novamente o link do e-mail e tente de novo.");
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <form onSubmit={submit} className="w-full max-w-md bg-surface p-8 rounded-xl shadow-sm border border-border space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Defina sua senha</h1>
        <p className="text-sm text-muted">Crie uma senha para acessar sua conta.</p>
        <PasswordInput className={inputClass} placeholder={`Nova senha (mín. ${MIN_PASSWORD_LENGTH})`} autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
        <p className="text-xs text-muted">Mín. {MIN_PASSWORD_LENGTH} caracteres, com maiúscula, minúscula e número.</p>
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 transition-colors">
          {loading ? "Salvando..." : "Salvar senha"}
        </button>
      </form>
    </main>
  );
}
