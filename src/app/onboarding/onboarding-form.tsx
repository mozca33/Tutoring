"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
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
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 p-5 flex flex-col items-center gap-2">
        <BookOpen size={28} />
        <span className="font-medium">Conta de professor</span>
        <span className="text-xs text-center text-muted">Você poderá agendar aulas e convidar alunos. Inclui 3 dias de teste grátis.</span>
      </div>
      <p className="text-xs text-muted text-center">É aluno? Sua conta é criada pelo seu professor, por convite no e-mail.</p>
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
      <button onClick={confirm} disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors">
        {loading ? "Salvando..." : "Continuar como professor"}
      </button>
    </div>
  );
}
