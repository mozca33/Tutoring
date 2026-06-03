"use client";

import { useState } from "react";

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Falha ao iniciar pagamento");
      window.location.href = data.url;
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={subscribe} disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors">
        {loading ? "Redirecionando..." : "Assinar agora"}
      </button>
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
    </div>
  );
}
