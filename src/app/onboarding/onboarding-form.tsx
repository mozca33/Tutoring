"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingForm() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!role) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ role, role_confirmed: true })
      .eq("id", user.id);
    if (error) { setLoading(false); return setError(error.message); }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setRole("student")}
          className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors ${
            role === "student" ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border hover:bg-background"
          }`}>
          <GraduationCap size={28} />
          <span className="font-medium">Sou aluno</span>
          <span className="text-xs text-muted">Quero ter aulas</span>
        </button>
        <button type="button" onClick={() => setRole("teacher")}
          className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors ${
            role === "teacher" ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border hover:bg-background"
          }`}>
          <BookOpen size={28} />
          <span className="font-medium">Sou professor</span>
          <span className="text-xs text-muted">Quero dar aulas</span>
        </button>
      </div>
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
      <button onClick={confirm} disabled={!role || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors">
        {loading ? "Salvando..." : "Continuar"}
      </button>
    </div>
  );
}
