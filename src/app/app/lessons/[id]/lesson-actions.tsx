"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, CalendarX, Trash2, CheckCircle2, X, SlidersHorizontal } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    new Date(initial.scheduled_at).toISOString().slice(0, 16),
  );
  const [duration, setDuration] = useState(initial.duration_minutes);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [summary, setSummary] = useState(initial.summary ?? "");

  const isOpen = initial.status !== "cancelled" && initial.status !== "completed";
  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  async function save() {
    setLoading(true);
    const { error } = await createClient().from("lessons").update({
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

  async function complete() {
    setCompleting(true);
    const { error } = await createClient().from("lessons")
      .update({ status: "completed", summary: summary || null }).eq("id", lessonId);
    setCompleting(false);
    if (error) return alert(error.message);
    setOpen(false);
    router.refresh();
  }

  async function cancel() {
    if (!confirm("Cancelar essa aula? O aluno continuará vendo, mas marcada como cancelada.")) return;
    const { error } = await createClient().from("lessons").update({ status: "cancelled" }).eq("id", lessonId);
    if (error) return alert(error.message);
    setOpen(false);
    router.refresh();
  }

  async function destroy() {
    if (!confirm("Apagar essa aula permanentemente? Isso remove arquivos, lições de casa e comentários.")) return;
    const { error } = await createClient().from("lessons").delete().eq("id", lessonId);
    if (error) return alert(error.message);
    router.push("/app");
    router.refresh();
  }

  const editCard = (
      <div className="w-80 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Editar aula</h3>
          <button onClick={() => setEditing(false)} aria-label="Fechar" className="text-muted hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted">Título</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted">Descrição</label>
          <textarea className={inputClass} rows={2} placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted">Data e hora</label>
          <input type="datetime-local" className={inputClass} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted">Duração</label>
          <select className={inputClass} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
            {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutos</option>)}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
            {loading ? "Salvando..." : "Salvar"}
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-background transition-colors">Cancelar</button>
        </div>
      </div>
    );

  const actionsCard = (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl p-4 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Ações da aula</h3>
        <span className="text-xs text-muted">Professor</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setEditing(true)}
          className="flex flex-col items-center gap-1 rounded-lg border border-border py-2.5 text-xs hover:bg-background transition-colors">
          <Pencil size={16} /> Editar
        </button>
        <button onClick={cancel} disabled={!isOpen}
          className="flex flex-col items-center gap-1 rounded-lg border border-border py-2.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-40 disabled:hover:bg-transparent">
          <CalendarX size={16} /> Cancelar
        </button>
        <button onClick={destroy}
          className="flex flex-col items-center gap-1 rounded-lg border border-border py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
          <Trash2 size={16} /> Excluir
        </button>
      </div>

      {isOpen && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3 space-y-2">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 size={16} /> Concluir aula
          </p>
          <textarea
            className="w-full rounded-lg border border-emerald-200 dark:border-emerald-900 bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
            placeholder="Resumo da aula (opcional) — fica visível para o aluno"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <button onClick={complete} disabled={completing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
            {completing ? "Salvando..." : "Marcar como concluída"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Ações da aula"
        title="Ações da aula"
        className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
      >
        <SlidersHorizontal size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setEditing(false); }} />
          <div className="absolute right-0 top-full mt-2 z-40">
            {editing ? editCard : actionsCard}
          </div>
        </>
      )}
    </div>
  );
}
