"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold">Criar conta</h1>

        <div className="flex gap-2">
          <button type="button" onClick={() => setRole("student")}
            className={`flex-1 py-2 rounded-lg border ${role === "student" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}>
            Sou aluno
          </button>
          <button type="button" onClick={() => setRole("teacher")}
            className={`flex-1 py-2 rounded-lg border ${role === "teacher" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}>
            Sou professor
          </button>
        </div>

        <input className="w-full border rounded-lg px-3 py-2" placeholder="Nome completo"
          value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className="w-full border rounded-lg px-3 py-2" type="email" placeholder="E-mail"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded-lg px-3 py-2" type="password" placeholder="Senha (min. 6)"
          value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium disabled:opacity-50">
          {loading ? "Criando..." : "Criar conta"}
        </button>
        <p className="text-sm text-slate-600 text-center">
          Já tem conta? <Link href="/login" className="text-indigo-600">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
