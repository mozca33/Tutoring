"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({
  initial,
}: {
  initial: { full_name: string; bio: string; email: string; role: string };
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name);
  const [bio, setBio] = useState(initial.bio);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, bio: bio || null })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg("Perfil atualizado!");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border rounded-xl p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
        <input
          className="w-full border rounded-lg px-3 py-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
        <input className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-slate-500" value={initial.email} disabled />
        <p className="text-xs text-slate-400 mt-1">O e-mail não pode ser alterado por aqui.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
        <input className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-slate-500" value={initial.role === "teacher" ? "Professor" : "Aluno"} disabled />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2"
          rows={3}
          placeholder="Conte um pouco sobre você..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      {msg && <p className={`text-sm ${msg.includes("!") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
      <button disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-indigo-700">
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
