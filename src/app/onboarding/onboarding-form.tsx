"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingForm() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!role) return;
    if (role === "student" && code.trim().length < 4) return setError("Informe o código do professor.");
    setLoading(true);
    setError(null);

    if (role === "student") {
      try {
        const res = await fetch("/api/student-link", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha");
      } catch (e) {
        setLoading(false);
        return setError(e instanceof Error ? e.message : "Erro");
      }
    } else {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { error } = await supabase.from("profiles").update({
        role: "teacher",
        role_confirmed: true,
        subscription_status: "trialing",
        trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", user.id);
      if (error) { setLoading(false); return setError(error.message); }
    }

    router.push("/app");
    router.refresh();
  }

  const cardCls = (active: boolean) =>
    `flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors ${
      active ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border hover:bg-background"
    }`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => { setRole("student"); setError(null); }} className={cardCls(role === "student")}>
          <GraduationCap size={28} />
          <span className="font-medium">Sou aluno</span>
          <span className="text-xs text-muted">Quero ter aulas</span>
        </button>
        <button type="button" onClick={() => { setRole("teacher"); setError(null); }} className={cardCls(role === "teacher")}>
          <BookOpen size={28} />
          <span className="font-medium">Sou professor</span>
          <span className="text-xs text-muted">Quero dar aulas</span>
        </button>
      </div>

      {role === "student" && (
        <div className="text-left">
          <label className="block text-sm font-medium mb-1">Código do professor</label>
          <input className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ex: A1B2C3" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <p className="text-xs text-muted mt-1">Peça o código ao seu professor para se vincular.</p>
        </div>
      )}

      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
      <button onClick={confirm} disabled={!role || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors">
        {loading ? "Salvando..." : "Continuar"}
      </button>
    </div>
  );
}
