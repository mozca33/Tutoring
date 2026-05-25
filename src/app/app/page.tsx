import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewLessonForm from "./new-lesson-form";

type LessonRow = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  teacher: { full_name: string } | null;
  student: { full_name: string } | null;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700" },
  live: { label: "Ao vivo", color: "bg-green-100 text-green-700" },
  completed: { label: "Concluída", color: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-600" },
};

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  const isTeacher = profile?.role === "teacher";

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, scheduled_at, duration_minutes, status, teacher:teacher_id(full_name), student:student_id(full_name)")
    .order("scheduled_at", { ascending: false })
    .returns<LessonRow[]>();

  const now = Date.now();
  const active = (lessons ?? []).filter((l) => l.status !== "cancelled" && l.status !== "completed" && new Date(l.scheduled_at).getTime() >= now).reverse();
  const past = (lessons ?? []).filter((l) => l.status === "completed" || l.status === "cancelled" || new Date(l.scheduled_at).getTime() < now);

  let students: { id: string; full_name: string }[] = [];
  if (isTeacher) {
    const { data } = await supabase
      .from("relationships")
      .select("student:student_id(id, full_name)")
      .eq("teacher_id", user.id)
      .returns<{ student: { id: string; full_name: string } }[]>();
    students = (data ?? []).map((r) => r.student).filter(Boolean);
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Próximas aulas</h2>
        </div>
        {active.length === 0 ? (
          <p className="text-slate-500">Nenhuma aula agendada.</p>
        ) : (
          <ul className="grid gap-3">
            {active.map((l) => <LessonCard key={l.id} lesson={l} />)}
          </ul>
        )}
      </section>

      {isTeacher && (
        <section className="bg-white p-6 rounded-xl border">
          <h2 className="text-lg font-semibold mb-4">Agendar nova aula</h2>
          <NewLessonForm students={students} />
          {students.length === 0 && (
            <p className="text-sm text-slate-500 mt-3">
              Você ainda não tem alunos vinculados. Vá em <Link href="/app/contatos" className="text-indigo-600">Contatos</Link> para adicionar.
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Histórico</h2>
        {past.length === 0 ? (
          <p className="text-slate-500">Nenhuma aula passada.</p>
        ) : (
          <ul className="grid gap-3">
            {past.map((l) => <LessonCard key={l.id} lesson={l} past />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function LessonCard({ lesson, past }: { lesson: LessonRow; past?: boolean }) {
  const dt = new Date(lesson.scheduled_at);
  const status = statusConfig[lesson.status] ?? statusConfig.scheduled;
  return (
    <li className="bg-white border rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{lesson.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
          </div>
          <p className="text-sm text-slate-500">
            {dt.toLocaleString("pt-BR")} · {lesson.duration_minutes} min ·{" "}
            com {lesson.teacher?.full_name} / {lesson.student?.full_name}
          </p>
        </div>
      </div>
      <Link
        href={`/app/lessons/${lesson.id}`}
        className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${past ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
      >
        {lesson.status === "completed" ? "Ver" : past ? "Abrir" : "Entrar"}
      </Link>
    </li>
  );
}
