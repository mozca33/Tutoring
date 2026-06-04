"use client";

import { useState } from "react";

export default function ManageButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Falha");
      window.location.href = data.url;
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={open} disabled={loading}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background transition-colors disabled:opacity-50">
        {loading ? "Abrindo..." : "Gerenciar assinatura"}
      </button>
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
    </div>
  );
}
