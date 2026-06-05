import { createClient } from "@/lib/supabase/server";
import ScheduleView, { type Lesson } from "./schedule-view";
import { teacherHasAccess, trialDaysLeft } from "@/lib/subscription";

type LessonRow = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  teacher: { full_name: string } | null;
  student: { full_name: string } | null;
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const { aluno } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("role, subscription_status, trial_ends_at").eq("id", user.id).single();
  const isTeacher = profile?.role === "teacher";

  const sub = {
    role: profile?.role ?? "student",
    subscription_status: profile?.subscription_status ?? "none",
    trial_ends_at: profile?.trial_ends_at ?? null,
  };
  const hasAccess = teacherHasAccess(sub);
  const daysLeft = trialDaysLeft(sub.trial_ends_at);

  const { data: rows } = await supabase
    .from("lessons")
    .select("id, title, scheduled_at, duration_minutes, status, teacher:teacher_id(full_name), student:student_id(full_name)")
    .order("scheduled_at", { ascending: true })
    .returns<LessonRow[]>();

  const lessons: Lesson[] = (rows ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    scheduled_at: l.scheduled_at,
    duration_minutes: l.duration_minutes,
    status: l.status,
    teacherName: l.teacher?.full_name ?? null,
    studentName: l.student?.full_name ?? null,
  }));

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
    <ScheduleView
      lessons={lessons}
      students={students}
      isTeacher={isTeacher}
      locked={isTeacher && !hasAccess}
      trialDaysLeft={sub.subscription_status === "trialing" ? daysLeft : null}
      subscriptionStatus={sub.subscription_status}
      presetStudentId={isTeacher && hasAccess ? aluno : undefined}
    />
  );
}
