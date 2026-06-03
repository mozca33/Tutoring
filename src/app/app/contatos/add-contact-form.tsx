"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";

export default function AddContactForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ link: string | null; alreadyExisted: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/invite-student", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setResult({ link: data.link ?? null, alreadyExisted: data.alreadyExisted });
      setName(""); setEmail("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
    setLoading(false);
  }

  function copy() {
    if (!result?.link) return;
    navigator.clipboard?.writeText(result.link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <input className={inputClass} placeholder="Nome do aluno (opcional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <input className={inputClass} type="email" placeholder="email@aluno.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
          {loading ? "Criando..." : "Convidar aluno"}
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      {result && (
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 space-y-2">
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            {result.alreadyExisted ? "Aluno já tinha conta — vinculado!" : "Conta criada e vinculada!"} Envie o link abaixo para o aluno definir a senha:
          </p>
          {result.link ? (
            <div className="flex items-center gap-2">
              <input readOnly value={result.link} className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground" onFocus={(e) => e.target.select()} />
              <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm">
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted">Não foi possível gerar o link agora. Tente reenviar pela lista de alunos.</p>
          )}
        </div>
      )}
    </div>
  );
}
