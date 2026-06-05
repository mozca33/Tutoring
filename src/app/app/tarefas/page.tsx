import { createClient } from "@/lib/supabase/server";
import TasksView, { type Task, type StudentOpt } from "./tasks-view";

type Row = {
  id: string;
  title: string;
  instructions: string | null;
  due_at: string | null;
  submitted_at: string | null;
  grade: string | null;
  feedback: string | null;
  created_at: string;
  teacher_id: string;
  student_id: string;
  student: { full_name: string } | null;
  teacher: { full_name: string } | null;
};

export default async function TarefasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isTeacher = profile?.role === "teacher";

  const { data: rows } = await supabase
    .from("homeworks")
    .select("id, title, instructions, due_at, submitted_at, grade, feedback, created_at, teacher_id, student_id, student:student_id(full_name), teacher:teacher_id(full_name)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const tasks: Task[] = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    instructions: r.instructions,
    dueAt: r.due_at,
    submittedAt: r.submitted_at,
    grade: r.grade,
    feedback: r.feedback,
    studentId: r.student_id,
    personName: isTeacher ? (r.student?.full_name ?? "Aluno") : (r.teacher?.full_name ?? "Professor"),
  }));

  let students: StudentOpt[] = [];
  if (isTeacher) {
    const { data } = await supabase
      .from("relationships")
      .select("student:student_id(id, full_name)")
      .eq("teacher_id", user.id)
      .returns<{ student: { id: string; full_name: string } }[]>();
    students = (data ?? []).map((r) => r.student).filter(Boolean);
  }

  return <TasksView currentUserId={user.id} isTeacher={isTeacher} tasks={tasks} students={students} />;
}
