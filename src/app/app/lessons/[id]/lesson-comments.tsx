"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author: { full_name: string } | null;
};

export default function LessonComments({ lessonId, initial }: { lessonId: string; initial: Comment[] }) {
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // Realtime: novos comentários de qualquer participante aparecem na hora.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments:${lessonId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "lesson_comments", filter: `lesson_id=eq.${lessonId}` },
        async (payload) => {
          const row = payload.new as { id: string; content: string; created_at: string; author_id: string };
          setItems((prev) => prev.some((c) => c.id === row.id) ? prev : prev); // evita corrida
          const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", row.author_id).single();
          setItems((prev) => prev.some((c) => c.id === row.id)
            ? prev
            : [...prev, { id: row.id, content: row.content, created_at: row.created_at, author: prof ?? null }]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lessonId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("lesson_comments")
      .insert({ lesson_id: lessonId, author_id: user.id, content: text })
      .select("id, content, created_at, author:author_id(full_name)")
      .single();
    setLoading(false);
    if (error || !data) return;
    setItems([...items, data as unknown as Comment]);
    setText("");
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.length === 0 && <p className="text-slate-500 text-sm">Nenhum comentário ainda.</p>}
        {items.map((c) => (
          <li key={c.id} className="border-l-2 border-indigo-200 pl-3">
            <p className="text-sm text-slate-500">
              {c.author?.full_name} · {new Date(c.created_at).toLocaleString("pt-BR")}
            </p>
            <p className="text-slate-800 whitespace-pre-wrap">{c.content}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-2">
        <textarea className="w-full border rounded-lg px-3 py-2" rows={3}
          placeholder="Escreva um resumo, observação ou pergunta..."
          value={text} onChange={(e) => setText(e.target.value)} />
        <button disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
          {loading ? "Enviando..." : "Adicionar comentário"}
        </button>
      </form>
    </div>
  );
}
