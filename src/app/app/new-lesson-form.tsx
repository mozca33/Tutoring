"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewLessonForm({ students }: { students: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("lessons").insert({
      teacher_id: user.id,
      student_id: studentId,
      title,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setTitle(""); setScheduledAt("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3">
      <input className="border rounded-lg px-3 py-2" placeholder="Título da aula"
        value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select className="border rounded-lg px-3 py-2" value={studentId}
        onChange={(e) => setStudentId(e.target.value)} required disabled={students.length === 0}>
        {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
      </select>
      <input type="datetime-local" className="border rounded-lg px-3 py-2"
        value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
      <input type="number" min={15} step={15} className="border rounded-lg px-3 py-2"
        value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} />
      {error && <p className="text-red-600 text-sm sm:col-span-2">{error}</p>}
      <button disabled={loading || students.length === 0}
        className="sm:col-span-2 bg-indigo-600 text-white py-2 rounded-lg font-medium disabled:opacity-50">
        {loading ? "Agendando..." : "Agendar aula"}
      </button>
    </form>
  );
}
