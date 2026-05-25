"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Homework = {
  id: string;
  title: string;
  instructions: string | null;
  due_at: string | null;
  submitted_at: string | null;
  submission_text: string | null;
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

  // Teacher: create form state
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");

  async function createHomework(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data, error } = await supabase.from("homeworks").insert({
      lesson_id: lessonId,
      teacher_id: currentUserId,
      student_id: studentId,
      title,
      instructions: instructions || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    }).select().single();
    if (error || !data) return alert(error?.message);
    setItems([data as Homework, ...items]);
    setTitle(""); setInstructions(""); setDueAt("");
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
            <button className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-lg">Atribuir tarefa</button>
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

  async function submit() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("homeworks")
      .update({ submission_text: submission, submitted_at: new Date().toISOString() })
      .eq("id", hw.id)
      .select().single();
    if (error || !data) return alert(error?.message);
    onChange(data as Homework);
    router.refresh();
  }

  async function grade_() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("homeworks")
      .update({ grade, feedback })
      .eq("id", hw.id)
      .select().single();
    if (error || !data) return alert(error?.message);
    onChange(data as Homework);
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
          <button onClick={submit} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm">
            {hw.submitted_at ? "Atualizar entrega" : "Entregar"}
          </button>
        </div>
      )}

      {!isStudent && hw.submission_text && (
        <div className="bg-slate-50 p-3 rounded">
          <p className="text-xs font-medium text-slate-600 mb-1">Resposta do aluno</p>
          <p className="text-sm whitespace-pre-wrap">{hw.submission_text}</p>
        </div>
      )}

      {isTeacher && hw.submitted_at && (
        <div className="space-y-2 bg-indigo-50 p-3 rounded">
          <p className="text-xs font-medium text-indigo-700">Correção</p>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Nota (ex: 9.5, A, Ótimo)"
            value={grade} onChange={(e) => setGrade(e.target.value)} />
          <textarea className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="Comentários"
            value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <button onClick={grade_} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm">Salvar correção</button>
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
