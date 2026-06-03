"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, ACCEPT_ATTR } from "@/lib/uploads";

type Homework = {
  id: string;
  title: string;
  instructions: string | null;
  due_at: string | null;
  submitted_at: string | null;
  submission_text: string | null;
  submission_file_path: string | null;
  submission_file_name: string | null;
  grade: string | null;
  feedback: string | null;
  teacher_id: string;
  student_id: string;
};

export default function LessonHomework({
  lessonId,
  currentUserId,
  isTeacher,
  studentId,
  initial,
}: {
  lessonId: string;
  currentUserId: string;
  isTeacher: boolean;
  studentId: string;
  initial: Homework[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  // Realtime: tarefas criadas/entregues/corrigidas atualizam para ambos.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`homeworks:${lessonId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "homeworks", filter: `lesson_id=eq.${lessonId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setItems((prev) => prev.filter((h) => h.id !== old.id));
            return;
          }
          const row = payload.new as Homework;
          setItems((prev) => prev.some((h) => h.id === row.id)
            ? prev.map((h) => h.id === row.id ? row : h)
            : [row, ...prev]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lessonId]);

  // Teacher: create form state
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [creating, setCreating] = useState(false);

  async function createHomework(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return; // evita duplicar com clique/duplo-submit rápido
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("homeworks").insert({
      lesson_id: lessonId,
      teacher_id: currentUserId,
      student_id: studentId,
      title,
      instructions: instructions || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    }).select().single();
    setCreating(false);
    if (error || !data) return alert(error?.message);
    const hw = data as Homework;
    setItems((prev) => prev.some((h) => h.id === hw.id) ? prev : [hw, ...prev]);
    setTitle(""); setInstructions(""); setDueAt("");
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "homework_assigned", id: hw.id }),
    }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {isTeacher && (
        <form onSubmit={createHomework} className="space-y-2 border-b pb-5">
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Título da tarefa"
            value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Instruções"
            value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          <div className="flex gap-2 items-center">
            <label className="text-sm text-slate-600">Prazo:</label>
            <input type="datetime-local" className="border rounded-lg px-3 py-2"
              value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            <button disabled={creating} className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{creating ? "Atribuindo..." : "Atribuir tarefa"}</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhuma lição de casa.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((hw) => (
            <HomeworkItem
              key={hw.id}
              hw={hw}
              currentUserId={currentUserId}
              isTeacher={isTeacher}
              onChange={(updated) => setItems(items.map((x) => x.id === updated.id ? updated : x))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function HomeworkItem({
  hw, currentUserId, isTeacher, onChange,
}: {
  hw: Homework;
  currentUserId: string;
  isTeacher: boolean;
  onChange: (h: Homework) => void;
}) {
  const router = useRouter();
  const [submission, setSubmission] = useState(hw.submission_text ?? "");
  const [grade, setGrade] = useState(hw.grade ?? "");
  const [feedback, setFeedback] = useState(hw.feedback ?? "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);

  async function submit() {
    if (submitting) return;
    if (!submission.trim() && !hw.submission_file_path) return alert("Escreva uma resposta ou anexe um arquivo.");
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("homeworks")
      .update({ submission_text: submission, submitted_at: new Date().toISOString() })
      .eq("id", hw.id)
      .select().single();
    setSubmitting(false);
    if (error || !data) return alert(error?.message);
    onChange(data as Homework);
    router.refresh();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = validateUpload(file);
    if (!valid.ok) { e.target.value = ""; return alert(valid.error); }
    setUploading(true);
    const supabase = createClient();

    // Remove arquivo anterior, se houver
    if (hw.submission_file_path) {
      await supabase.storage.from("lesson-files").remove([hw.submission_file_path]);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `homework/${hw.id}/${crypto.randomUUID()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("lesson-files").upload(path, file);
    if (upErr) { setUploading(false); e.target.value = ""; return alert(upErr.message); }

    const { data, error } = await supabase
      .from("homeworks")
      .update({
        submission_file_path: path,
        submission_file_name: file.name,
        submitted_at: hw.submitted_at ?? new Date().toISOString(),
      })
      .eq("id", hw.id)
      .select().single();
    setUploading(false);
    e.target.value = "";
    if (error || !data) return alert(error?.message);
    onChange(data as Homework);
    router.refresh();
  }

  async function downloadFile() {
    if (!hw.submission_file_path) return;
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("lesson-files")
      .createSignedUrl(hw.submission_file_path, 60);
    if (error || !data) return alert("Erro ao gerar link");
    window.open(data.signedUrl, "_blank");
  }

  async function removeFile() {
    if (!hw.submission_file_path) return;
    if (!confirm("Remover o arquivo anexado?")) return;
    const supabase = createClient();
    await supabase.storage.from("lesson-files").remove([hw.submission_file_path]);
    const { data, error } = await supabase
      .from("homeworks")
      .update({ submission_file_path: null, submission_file_name: null })
      .eq("id", hw.id)
      .select().single();
    if (error || !data) return alert(error?.message);
    onChange(data as Homework);
    router.refresh();
  }

  async function grade_() {
    if (grading) return;
    setGrading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("homeworks")
      .update({ grade, feedback })
      .eq("id", hw.id)
      .select().single();
    setGrading(false);
    if (error || !data) return alert(error?.message);
    onChange(data as Homework);
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "homework_graded", id: hw.id }),
    }).catch(() => {});
    router.refresh();
  }

  const isStudent = !isTeacher && hw.student_id === currentUserId;

  return (
    <li className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{hw.title}</p>
          {hw.due_at && (
            <p className="text-xs text-slate-500">Prazo: {new Date(hw.due_at).toLocaleString("pt-BR")}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded ${hw.submitted_at ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {hw.submitted_at ? "Entregue" : "Pendente"}
        </span>
      </div>
      {hw.instructions && <p className="text-sm text-slate-700 whitespace-pre-wrap">{hw.instructions}</p>}

      {isStudent && (
        <div className="space-y-2 bg-slate-50 p-3 rounded">
          <p className="text-xs font-medium text-slate-600">Sua resposta</p>
          <textarea className="w-full border rounded-lg px-3 py-2" rows={3}
            value={submission} onChange={(e) => setSubmission(e.target.value)} />
          {hw.submission_file_path ? (
            <div className="flex items-center gap-3 text-sm">
              <button onClick={downloadFile} className="text-indigo-600 hover:underline">📎 {hw.submission_file_name}</button>
              <button onClick={removeFile} className="text-red-600 hover:underline">Remover</button>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <button onClick={submit} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
              {submitting ? "Enviando..." : hw.submitted_at ? "Atualizar entrega" : "Entregar"}
            </button>
            <label className="inline-block">
              <span className="inline-block border border-indigo-600 text-indigo-600 px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-indigo-50">
                {uploading ? "Enviando..." : hw.submission_file_path ? "Trocar arquivo" : "Anexar arquivo"}
              </span>
              <input type="file" accept={ACCEPT_ATTR} className="hidden" onChange={onFileChange} disabled={uploading} />
            </label>
          </div>
        </div>
      )}

      {!isStudent && (hw.submission_text || hw.submission_file_path) && (
        <div className="bg-slate-50 p-3 rounded space-y-2">
          <p className="text-xs font-medium text-slate-600">Resposta do aluno</p>
          {hw.submission_text && <p className="text-sm whitespace-pre-wrap">{hw.submission_text}</p>}
          {hw.submission_file_path && (
            <button onClick={downloadFile} className="text-indigo-600 hover:underline text-sm">📎 {hw.submission_file_name}</button>
          )}
        </div>
      )}

      {isTeacher && hw.submitted_at && (
        <div className="space-y-2 bg-indigo-50 p-3 rounded">
          <p className="text-xs font-medium text-indigo-700">Correção</p>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Nota (ex: 9.5, A, Ótimo)"
            value={grade} onChange={(e) => setGrade(e.target.value)} />
          <textarea className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="Comentários"
            value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <button onClick={grade_} disabled={grading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">{grading ? "Salvando..." : "Salvar correção"}</button>
        </div>
      )}

      {!isTeacher && hw.grade && (
        <div className="bg-indigo-50 p-3 rounded">
          <p className="text-xs font-medium text-indigo-700">Correção do professor</p>
          <p className="text-sm"><strong>Nota:</strong> {hw.grade}</p>
          {hw.feedback && <p className="text-sm whitespace-pre-wrap">{hw.feedback}</p>}
        </div>
      )}
    </li>
  );
}
