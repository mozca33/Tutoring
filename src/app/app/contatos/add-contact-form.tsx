"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddContactForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/invite-student", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setMsg({ type: "ok", text: data.alreadyExisted ? "Aluno já tinha conta — vinculado!" : "Convite enviado! O aluno receberá um e-mail para definir a senha." });
      setName(""); setEmail("");
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Erro" });
    }
    setLoading(false);
  }

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <input className={inputClass} placeholder="Nome do aluno" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        <input className={inputClass} type="email" placeholder="email@aluno.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
          {loading ? "Enviando..." : "Convidar aluno"}
        </button>
        {msg && <p className={`text-sm ${msg.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
