"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <input className="w-full border rounded-lg px-3 py-2" type="email" placeholder="E-mail"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded-lg px-3 py-2" type="password" placeholder="Senha"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium disabled:opacity-50">
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-sm text-slate-600 text-center">
          Não tem conta? <Link href="/signup" className="text-indigo-600">Criar agora</Link>
        </p>
      </form>
    </main>
  );
}
