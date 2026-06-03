"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";
import PasswordInput from "@/components/password-input";
import GoogleButton from "@/components/google-button";
import { validateEmail, validateName, validatePassword, MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { authRedirectTo } from "@/lib/auth-redirect";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone] = useState<"confirm" | "invited" | null>(null);

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  async function teacherSignup() {
    const name = validateName(fullName);
    if (!name.ok) return setError(name.error!);
    const mail = validateEmail(email);
    if (!mail.ok) return setError(mail.error!);
    const pass = validatePassword(password);
    if (!pass.ok) return setError(pass.error!);

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: mail.value,
      password,
      options: { data: { full_name: name.value, role: "teacher" }, emailRedirectTo: authRedirectTo("/app") },
    });
    setLoading(false);
    if (error) return setError(error.message);
    if (!data.session) { setDone("confirm"); return; }
    router.push("/app");
    router.refresh();
  }

  async function studentJoin() {
    const name = validateName(fullName);
    if (!name.ok) return setError(name.error!);
    const mail = validateEmail(email);
    if (!mail.ok) return setError(mail.error!);
    if (code.trim().length < 4) return setError("Informe o código do professor.");

    setLoading(true);
    try {
      const res = await fetch("/api/student-join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.value, email: mail.value, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setDone("invited");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
    setLoading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (role === "teacher") await teacherSignup();
    else await studentJoin();
  }

  async function signUpWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirectTo("/app") },
    });
    if (error) { setGoogleLoading(false); setError(error.message); }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-md bg-surface p-8 rounded-xl shadow-sm border border-border text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950 grid place-items-center">
            <MailCheck className="text-emerald-600 dark:text-emerald-400" size={28} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {done === "confirm" ? "Confirme seu e-mail" : "Tudo certo!"}
          </h1>
          <p className="text-sm text-muted">
            {done === "confirm"
              ? <>Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>. Abra para ativar sua conta.</>
              : <>Enviamos um e-mail para <strong className="text-foreground">{email}</strong> para você <strong>definir sua senha</strong> e acessar. Você já está vinculado ao seu professor.</>}
          </p>
          <Link href="/login" className="inline-block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors">
            Ir para o login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <form onSubmit={onSubmit} className="w-full max-w-md bg-surface p-8 rounded-xl shadow-sm border border-border space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Criar conta</h1>

        <div className="flex gap-2">
          <button type="button" onClick={() => { setRole("student"); setError(null); }}
            className={`flex-1 py-2 rounded-lg border ${role === "student" ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border text-foreground"}`}>
            Sou aluno
          </button>
          <button type="button" onClick={() => { setRole("teacher"); setError(null); }}
            className={`flex-1 py-2 rounded-lg border ${role === "teacher" ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border text-foreground"}`}>
            Sou professor
          </button>
        </div>

        {role === "teacher" && (
          <>
            <GoogleButton onClick={signUpWithGoogle} disabled={googleLoading} label={googleLoading ? "Conectando..." : "Cadastrar com Google"} />
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <input className={inputClass} placeholder="Nome completo" autoComplete="name" maxLength={80}
          value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className={inputClass} type="email" placeholder="E-mail" autoComplete="email" maxLength={254}
          value={email} onChange={(e) => setEmail(e.target.value)} required />

        {role === "teacher" ? (
          <>
            <PasswordInput className={inputClass} placeholder={`Senha (mín. ${MIN_PASSWORD_LENGTH})`} autoComplete="new-password" maxLength={72}
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
            <p className="text-xs text-muted">A senha deve ter ao menos {MIN_PASSWORD_LENGTH} caracteres, com maiúscula, minúscula e número.</p>
          </>
        ) : (
          <>
            <input className={`${inputClass} tracking-widest uppercase`} placeholder="Código do professor" maxLength={10}
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
            <p className="text-xs text-muted">Peça o código ao seu professor. Você receberá um e-mail para definir sua senha.</p>
          </>
        )}

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 transition-colors">
          {loading ? "Enviando..." : role === "teacher" ? "Criar conta" : "Entrar com código"}
        </button>
        <p className="text-sm text-muted text-center">
          Já tem conta? <Link href="/login" className="text-indigo-600 dark:text-indigo-400">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
