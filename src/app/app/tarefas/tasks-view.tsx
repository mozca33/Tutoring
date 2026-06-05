"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Clock, CheckCircle2, Hourglass, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type StudentOpt = { id: string; full_name: string };
export type Task = {
  id: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  submittedAt: string | null;
  grade: string | null;
  feedback: string | null;
  studentId: string;
  personName: string;
};

type Status = "pending" | "submitted" | "graded";
function statusOf(t: Task): Status {
  if (t.grade) return "graded";
  if (t.submittedAt) return "submitted";
  return "pending";
}
const STATUS: Record<Status, { label: string; chip: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", icon: Hourglass },
  submitted: { label: "Entregue", chip: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", icon: Clock },
  graded: { label: "Corrigida", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", icon: CheckCircle2 },
};

export default function TasksView({
  currentUserId, isTeacher, tasks, students,
}: {
  currentUserId: string;
  isTeacher: boolean;
  tasks: Task[];
  students: StudentOpt[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.studentId === filter)),
    [tasks, filter],
  );

  const counts = useMemo(() => {
    const c = { pending: 0, submitted: 0, graded: 0 };
    for (const t of visible) c[statusOf(t)]++;
    return c;
  }, [visible]);
  const total = visible.length || 1;

  async function markSubmitted(t: Task) {
    setBusy(t.id);
    await createClient().from("homeworks").update({ submitted_at: new Date().toISOString() }).eq("id", t.id);
    setBusy(null);
    router.refresh();
  }

  async function grade(t: Task) {
    const g = window.prompt("Nota / avaliação (ex.: 9,5 ou 'Ótimo'):", t.grade ?? "");
    if (g === null) return;
    const fb = window.prompt("Comentário (opcional):", t.feedback ?? "") ?? "";
    setBusy(t.id);
    await createClient().from("homeworks").update({
      grade: g.trim() || null,
      feedback: fb.trim() || null,
      submitted_at: t.submittedAt ?? new Date().toISOString(),
    }).eq("id", t.id);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Tarefas</h1>
          <p className="text-muted">{isTeacher ? "Crie e acompanhe as tarefas dos seus alunos." : "Suas tarefas e o status de cada uma."}</p>
        </div>
        {isTeacher && students.length > 0 && (
          <button onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium transition-colors">
            <Plus size={16} /> Nova tarefa
          </button>
        )}
      </header>

      {/* Métricas com indicadores visuais */}
      <div className="grid grid-cols-3 gap-3">
        {(["pending", "submitted", "graded"] as Status[]).map((s) => {
          const Icon = STATUS[s].icon;
          const val = counts[s];
          return (
            <div key={s} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS[s].chip}`}>
                  <Icon size={12} /> {STATUS[s].label}
                </span>
                <span className="text-2xl font-semibold">{val}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden">
                <div className={`h-full ${s === "pending" ? "bg-amber-500" : s === "submitted" ? "bg-blue-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.round((val / total) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtro por aluno (professor) */}
      {isTeacher && students.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted">Aluno:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">Todos</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
      )}

      {/* Lista */}
      {visible.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <ClipboardList size={32} className="mx-auto text-muted mb-2" />
          <p className="font-medium">Nenhuma tarefa por aqui</p>
          {isTeacher && <p className="text-sm text-muted mt-1">Crie a primeira com <strong>Nova tarefa</strong>.</p>}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => {
            const st = statusOf(t);
            const Icon = STATUS[st].icon;
            const overdue = st === "pending" && t.dueAt && new Date(t.dueAt).getTime() < Date.now();
            return (
              <li key={t.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{t.title}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium ${STATUS[st].chip}`}>
                        <Icon size={11} /> {STATUS[st].label}
                      </span>
                      {t.grade && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-medium">Nota {t.grade}</span>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{t.personName}{t.dueAt ? ` · entrega ${new Date(t.dueAt).toLocaleDateString("pt-BR")}` : ""}{overdue ? " · atrasada" : ""}</p>
                    {t.instructions && <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{t.instructions}</p>}
                    {t.feedback && <p className="text-xs mt-1"><span className="font-medium">Comentário:</span> {t.feedback}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col gap-1.5">
                    {isTeacher ? (
                      <button onClick={() => grade(t)} disabled={busy === t.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-background disabled:opacity-50 transition-colors">
                        {t.grade ? "Reavaliar" : "Corrigir"}
                      </button>
                    ) : st === "pending" ? (
                      <button onClick={() => markSubmitted(t)} disabled={busy === t.id}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors">
                        Marcar entregue
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <CreateTaskModal currentUserId={currentUserId} students={students}
          onClose={() => setCreating(false)} onCreated={() => { setCreating(false); router.refresh(); }} />
      )}
    </div>
  );
}

function CreateTaskModal({
  currentUserId, students, onClose, onCreated,
}: {
  currentUserId: string;
  students: StudentOpt[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [due, setDue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !studentId) return;
    setLoading(true);
    setError(null);
    const { error } = await createClient().from("homeworks").insert({
      teacher_id: currentUserId,
      student_id: studentId,
      lesson_id: null,
      title: title.trim(),
      instructions: instructions.trim() || null,
      due_at: due ? new Date(due).toISOString() : null,
    });
    setLoading(false);
    if (error) { setError("Não foi possível criar a tarefa."); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Nova tarefa</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Aluno</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required
              placeholder="Ex: Lista de exercícios 3"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Instruções (opcional)</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prazo (opcional)</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background transition-colors">Cancelar</button>
            <button disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? "Criando…" : "Criar tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
