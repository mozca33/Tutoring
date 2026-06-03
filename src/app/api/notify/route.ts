import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, emailLayout } from "@/lib/email";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";

// Notifica o aluno por e-mail após ações do professor.
// Body: { type: "lesson_scheduled" | "homework_assigned" | "homework_graded", id: string }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { type, id } = await req.json().catch(() => ({}));
  if (!type || !id) return NextResponse.json({ error: "bad request" }, { status: 400 });

  async function studentEmail(studentId: string) {
    const { data } = await supabase.from("profiles").select("email, full_name").eq("id", studentId).single();
    return data;
  }

  if (type === "lesson_scheduled") {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("title, scheduled_at, teacher_id, student_id, teacher:teacher_id(full_name)")
      .eq("id", id)
      .single<{ title: string; scheduled_at: string; teacher_id: string; student_id: string; teacher: { full_name: string } | null }>();
    if (!lesson || lesson.teacher_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const student = await studentEmail(lesson.student_id);
    if (!student?.email) return NextResponse.json({ ok: false, skipped: "sem e-mail" });
    const quando = new Date(lesson.scheduled_at).toLocaleString("pt-BR");
    const r = await sendEmail({
      to: student.email,
      subject: `Nova aula agendada: ${lesson.title}`,
      html: emailLayout(
        "Você tem uma nova aula!",
        `<strong>${lesson.teacher?.full_name ?? "Seu professor"}</strong> agendou a aula <strong>${lesson.title}</strong> para <strong>${quando}</strong>.`,
        "Ver no calendário", `${SITE}/app`,
      ),
    });
    return NextResponse.json(r);
  }

  if (type === "homework_assigned" || type === "homework_graded") {
    const { data: hw } = await supabase
      .from("homeworks")
      .select("title, teacher_id, student_id, grade, lesson_id")
      .eq("id", id)
      .single<{ title: string; teacher_id: string; student_id: string; grade: string | null; lesson_id: string }>();
    if (!hw || hw.teacher_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const student = await studentEmail(hw.student_id);
    if (!student?.email) return NextResponse.json({ ok: false, skipped: "sem e-mail" });

    const assigned = type === "homework_assigned";
    const r = await sendEmail({
      to: student.email,
      subject: assigned ? `Nova lição de casa: ${hw.title}` : `Lição corrigida: ${hw.title}`,
      html: emailLayout(
        assigned ? "Nova lição de casa" : "Sua lição foi corrigida",
        assigned
          ? `Você recebeu a tarefa <strong>${hw.title}</strong>.`
          : `A tarefa <strong>${hw.title}</strong> foi corrigida${hw.grade ? ` — nota: <strong>${hw.grade}</strong>` : ""}.`,
        "Abrir aula", `${SITE}/app/lessons/${hw.lesson_id}`,
      ),
    });
    return NextResponse.json(r);
  }

  return NextResponse.json({ error: "tipo desconhecido" }, { status: 400 });
}
