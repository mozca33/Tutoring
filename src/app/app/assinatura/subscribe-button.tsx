"use client";

import { useState } from "react";

export default function SubscribeButton() {
  const [plan, setPlan] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Falha ao iniciar pagamento");
      window.location.href = data.url;
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  const opt = (value: "monthly" | "annual", title: string, price: string, hint?: string) => (
    <button type="button" onClick={() => setPlan(value)}
      className={`flex-1 rounded-lg border p-3 text-left transition-colors ${plan === value ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950" : "border-border hover:bg-background"}`}>
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-lg font-semibold">{price}</span>
      {hint && <span className="block text-xs text-emerald-600 dark:text-emerald-400">{hint}</span>}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {opt("monthly", "Mensal", "R$ 49,90/mês")}
        {opt("annual", "Anual", "R$ 499/ano", "≈ 2 meses grátis")}
      </div>
      <button onClick={subscribe} disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors">
        {loading ? "Redirecionando..." : "Assinar agora"}
      </button>
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
    </div>
  );
}
