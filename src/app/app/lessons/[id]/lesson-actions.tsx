"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, CalendarX, CalendarClock, Trash2, CheckCircle2, X, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "menu" | "edit" | "cancel" | "reschedule";

function hhmm(d: string | Date) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function ddmmyyyy(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function LessonActions({
  lessonId,
  studentId,
  initial,
}: {
  lessonId: string;
  studentId: string;
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
  const [mode, setMode] = useState<Mode>("menu");
  const [busy, setBusy] = useState(false);

  // Edit
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [scheduledAt, setScheduledAt] = useState(new Date(initial.scheduled_at).toISOString().slice(0, 16));
  const [duration, setDuration] = useState(initial.duration_minutes);
  // Conclude
  const [summary, setSummary] = useState(initial.summary ?? "");
  // Cancel / Reschedule
  const [justification, setJustification] = useState("");
  const [newDate, setNewDate] = useState(new Date(initial.scheduled_at).toISOString().slice(0, 16));

  const isOpen = initial.status !== "cancelled" && initial.status !== "completed";
  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  async function currentUserId() {
    return (await createClient().auth.getUser()).data.user?.id ?? null;
  }

  async function insertEvent(eventType: string, content: string, just?: string) {
    const uid = await currentUserId();
    if (!uid) return;
    await createClient().from("messages").insert({
      sender_id: uid, recipient_id: studentId, lesson_id: lessonId,
      kind: "event", event_type: eventType, justification: just || null, content,
    });
  }

  async function save() {
    setBusy(true);
    const { error } = await createClient().from("lessons").update({
      title, description: description || null,
      scheduled_at: new Date(scheduledAt).toISOString(), duration_minutes: duration,
    }).eq("id", lessonId);
    setBusy(false);
    if (error) return alert(error.message);
    setOpen(false); setMode("menu"); router.refresh();
  }

  async function complete() {
    setBusy(true);
    const { error } = await createClient().from("lessons")
      .update({ status: "completed", summary: summary || null }).eq("id", lessonId);
    if (!error) await insertEvent("completed", `Aula dada: "${initial.title}" às ${hhmm(initial.scheduled_at)}.`);
    setBusy(false);
    if (error) return alert(error.message);
    setOpen(false); router.refresh();
  }

  async function cancel() {
    if (!justification.trim()) return alert("Informe a justificativa do cancelamento.");
    setBusy(true);
    const { error } = await createClient().from("lessons").update({ status: "cancelled" }).eq("id", lessonId);
    if (!error) await insertEvent("cancelled", `Aula cancelada: "${initial.title}" às ${hhmm(initial.scheduled_at)}.`, justification.trim());
    setBusy(false);
    if (error) return alert(error.message);
    setOpen(false); setMode("menu"); router.refresh();
  }

  async function reschedule() {
    if (!justification.trim()) return alert("Informe a justificativa da remarcação.");
    const iso = new Date(newDate).toISOString();
    setBusy(true);
    const { error } = await createClient().from("lessons")
      .update({ status: "rescheduled", scheduled_at: iso }).eq("id", lessonId);
    if (!error) await insertEvent("rescheduled", `Aula remarcada: "${initial.title}" para ${ddmmyyyy(iso)} às ${hhmm(iso)}.`, justification.trim());
    setBusy(false);
    if (error) return alert(error.message);
    setOpen(false); setMode("menu"); router.refresh();
  }

  async function destroy() {
    if (!confirm("Apagar essa aula permanentemente? Isso remove arquivos, lições de casa e comentários.")) return;
    const { error } = await createClient().from("lessons").delete().eq("id", lessonId);
    if (error) return alert(error.message);
    router.push("/app"); router.refresh();
  }

  const cardWrap = "w-80 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl p-4 space-y-3 shadow-xl";

  function header(title: string) {
    return (
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        <button onClick={() => setMode("menu")} className="text-muted hover:text-foreground"><X size={18} /></button>
      </div>
    );
  }

  let card: React.ReactNode;
  if (mode === "edit") {
    card = (
      <div className={cardWrap}>
        {header("Editar aula")}
        <div className="space-y-1"><label className="text-xs font-medium text-muted">Título</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-xs font-medium text-muted">Descrição</label>
          <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-xs font-medium text-muted">Data e hora</label>
          <input type="datetime-local" className={inputClass} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-xs font-medium text-muted">Duração</label>
          <select className={inputClass} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
            {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutos</option>)}</select></div>
        <button onClick={save} disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{busy ? "Salvando..." : "Salvar"}</button>
      </div>
    );
  } else if (mode === "cancel") {
    card = (
      <div className={cardWrap}>
        {header("Cancelar aula")}
        <p className="text-xs text-muted">O aluno verá o cancelamento e a justificativa no chat.</p>
        <textarea className={inputClass} rows={3} placeholder="Justificativa (obrigatória)" value={justification} onChange={(e) => setJustification(e.target.value)} />
        <button onClick={cancel} disabled={busy} className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{busy ? "Cancelando..." : "Confirmar cancelamento"}</button>
      </div>
    );
  } else if (mode === "reschedule") {
    card = (
      <div className={cardWrap}>
        {header("Remarcar aula")}
        <div className="space-y-1"><label className="text-xs font-medium text-muted">Nova data e hora</label>
          <input type="datetime-local" className={inputClass} value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
        <textarea className={inputClass} rows={3} placeholder="Justificativa (obrigatória)" value={justification} onChange={(e) => setJustification(e.target.value)} />
        <button onClick={reschedule} disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{busy ? "Remarcando..." : "Confirmar remarcação"}</button>
      </div>
    );
  } else {
    card = (
      <div className={cardWrap}>
        <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">Ações da aula</h3><span className="text-xs text-muted">Professor</span></div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setMode("edit")} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs hover:bg-background"><Pencil size={15} /> Editar</button>
          <button onClick={() => { setJustification(""); setMode("reschedule"); }} disabled={!isOpen} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs hover:bg-background disabled:opacity-40"><CalendarClock size={15} /> Remarcar</button>
          <button onClick={() => { setJustification(""); setMode("cancel"); }} disabled={!isOpen} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-40"><CalendarX size={15} /> Cancelar</button>
          <button onClick={destroy} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 size={15} /> Excluir</button>
        </div>
        {isOpen && (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3 space-y-2">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"><CheckCircle2 size={16} /> Concluir aula</p>
            <textarea className="w-full rounded-lg border border-emerald-200 dark:border-emerald-900 bg-surface px-3 py-2 text-sm text-foreground" rows={3} placeholder="Resumo da aula (opcional) — fica visível para o aluno" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <button onClick={complete} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{busy ? "Salvando..." : "Marcar como concluída"}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => { setOpen((v) => !v); setMode("menu"); }} aria-label="Ações da aula" title="Ações da aula"
        className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border text-foreground hover:bg-surface transition-colors">
        <SlidersHorizontal size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setMode("menu"); }} />
          <div className="absolute right-0 top-full mt-2 z-40">{card}</div>
        </>
      )}
    </div>
  );
}
