"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddContactForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: contact, error: lookupErr } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email.trim())
      .maybeSingle();

    if (lookupErr || !contact) {
      setLoading(false);
      return setMsg({ type: "err", text: "Usuário não encontrado. Verifique o e-mail." });
    }
    if (contact.id === user.id) {
      setLoading(false);
      return setMsg({ type: "err", text: "Você não pode adicionar a si mesmo." });
    }

    // Qualquer usuário (aluno ou outro professor) pode ser vinculado como aluno.
    const { error } = await supabase.from("relationships").insert({
      teacher_id: user.id,
      student_id: contact.id,
    });
    setLoading(false);

    if (error) {
      const text = error.code === "23505" ? "Esse contato já está vinculado." : error.message;
      return setMsg({ type: "err", text });
    }
    setMsg({ type: "ok", text: "Contato vinculado!" });
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input className="flex-1 border rounded-lg px-3 py-2" type="email"
        placeholder="email@aluno.com"
        value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? "..." : "Adicionar"}
      </button>
      {msg && <p className={`text-sm self-center ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
