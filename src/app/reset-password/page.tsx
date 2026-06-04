"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";
import PasswordInput from "@/components/password-input";
import { validatePassword, MIN_PASSWORD_LENGTH } from "@/lib/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O link de recuperação/convite traz a sessão na URL; aguardamos ela ser detectada.
  useEffect(() => {
    const supabase = createClient();
    let done = false;
    supabase.auth.getSession().then(({ data }) => { if (data.session && !done) { done = true; setStatus("ready"); } });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && !done) { done = true; setStatus("ready"); }
    });
    const t = setTimeout(() => { if (!done) setStatus("invalid"); }, 4000);
    return () => { clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pass = validatePassword(password);
    if (!pass.ok) return setError(pass.error!);
    setLoading(true);
    const supabase = createClient();
    const { data: updated, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      const msg = /weak|pwned|leak|compromis/i.test(error.message)
        ? "Essa senha é muito comum / já vazou em outros sites. Escolha uma senha diferente e única."
        : /same/i.test(error.message)
          ? "A nova senha precisa ser diferente da anterior."
          : `Não foi possível definir a senha: ${error.message}`;
      return setError(msg);
    }
    if (updated.user) await supabase.from("profiles").update({ invited_pending: false }).eq("id", updated.user.id);
    setLoading(false);
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-md bg-surface p-8 rounded-xl shadow-sm border border-border space-y-4 text-center">
        {status === "checking" && (
          <p className="text-sm text-muted flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Validando o link…</p>
        )}

        {status === "invalid" && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Link inválido ou expirado</h1>
            <p className="text-sm text-muted">Peça ao seu professor um novo link de acesso.</p>
          </>
        )}

        {status === "ready" && (
          <form onSubmit={submit} className="space-y-4 text-left">
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
        )}
      </div>
    </main>
  );
}
