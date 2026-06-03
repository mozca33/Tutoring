"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function ResendInviteButton({ studentId }: { studentId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied" | "error">("idle");

  async function getLink() {
    setState("loading");
    try {
      const res = await fetch("/api/resend-invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.link) throw new Error();
      await navigator.clipboard?.writeText(data.link);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button onClick={getLink} disabled={state === "loading"}
      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-60">
      {state === "copied" ? <Check size={12} /> : <Link2 size={12} />}
      {state === "copied" ? "Link copiado!" : state === "loading" ? "Gerando..." : state === "error" ? "Erro" : "Copiar link de acesso"}
    </button>
  );
}
