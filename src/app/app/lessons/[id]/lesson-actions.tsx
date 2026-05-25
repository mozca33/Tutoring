"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LessonActions({
  lessonId,
  initial,
}: {
  lessonId: string;
  initial: {
    title: string;
    description: string | null;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    summary: string | null;
  };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    new Date(initial.scheduled_at).toISOString().slice(0, 16),
  );
  const [duration, setDuration] = useState(initial.duration_minutes);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("lessons").update({
      title,
      description: description || null,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
    }).eq("id", lessonId);
    setLoading(false);
    if (error) return alert(error.message);
    setEditing(false);
    router.refresh();
  }

  const [completing, setCompleting] = useState(false);
  const [summary, setSummary] = useState(initial.summary ?? "");

  async function complete() {
    setCompleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("lessons")
      .update({ status: "completed", summary: summary || null })
      .eq("id", lessonId);
    setCompleting(false);
    if (error) return alert(error.message);
    router.refresh();
  }

  async function cancel() {
    if (!confirm("Cancelar essa aula?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("lessons")
      .update({ status: "cancelled" }).eq("id", lessonId);
    if (error) return alert(error.message);
    router.refresh();
  }

  async function destroy() {
    if (!confirm("Apagar essa aula permanentemente? Isso remove arquivos, lições de casa e comentários.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) return alert(error.message);
    router.push("/app");
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 border rounded hover:bg-slate-50">Editar</button>
          {initial.status !== "cancelled" && initial.status !== "completed" && (
            <button onClick={cancel} className="text-sm px-3 py-1.5 border rounded text-amber-700 hover:bg-amber-50">Cancelar aula</button>
          )}
          <button onClick={destroy} className="text-sm px-3 py-1.5 border rounded text-red-600 hover:bg-red-50">Excluir</button>
        </div>
        {initial.status !== "cancelled" && initial.status !== "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-green-800">Concluir aula</p>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              placeholder="Resumo da aula (opcional)"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <button
              onClick={complete}
              disabled={completing}
              className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {completing ? "Salvando..." : "Marcar como concluída"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-2">
      <input className="w-full border rounded-lg px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="Descrição"
        value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex gap-2">
        <input type="datetime-local" className="border rounded-lg px-3 py-2"
          value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        <input type="number" min={15} step={15} className="border rounded-lg px-3 py-2 w-24"
          value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded">
          {loading ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={() => setEditing(false)} className="border px-4 py-2 rounded">Cancelar edição</button>
      </div>
    </div>
  );
}
