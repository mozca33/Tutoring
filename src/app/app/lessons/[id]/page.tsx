import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonRoom from "./lesson-room";
import LessonComments from "./lesson-comments";
import LessonFiles from "./lesson-files";
import LessonHomework from "./lesson-homework";
import LessonActions from "./lesson-actions";
import RecordingSection from "./recording-section";
import LessonChat from "./lesson-chat";
import BoardLauncher from "./board-launcher";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, description, scheduled_at, duration_minutes, status, teacher_id, student_id, summary, recording_path, recording_status, transcript, board_student_allowed, teacher:teacher_id(full_name), student:student_id(full_name)")
    .eq("id", id)
    .single<{
      id: string; title: string; description: string | null;
      scheduled_at: string; duration_minutes: number; status: string;
      teacher_id: string; student_id: string; summary: string | null;
      recording_path: string | null; recording_status: string | null;
      transcript: string | null; board_student_allowed: boolean;
      teacher: { full_name: string } | null;
      student: { full_name: string } | null;
    }>();
  if (!lesson) notFound();

  const isTeacher = lesson.teacher_id === user.id;

  const [{ data: comments }, { data: files }, { data: homeworks }] = await Promise.all([
    supabase.from("lesson_comments")
      .select("id, content, created_at, author:author_id(full_name)")
      .eq("lesson_id", id).order("created_at", { ascending: true })
      .returns<{ id: string; content: string; created_at: string; author: { full_name: string } | null }[]>(),
    supabase.from("lesson_files")
      .select("id, file_name, storage_path, size_bytes, mime_type, uploader_id, created_at")
      .eq("lesson_id", id).order("created_at", { ascending: false }),
    supabase.from("homeworks")
      .select("id, title, instructions, due_at, submitted_at, submission_text, submission_file_path, submission_file_name, grade, feedback, teacher_id, student_id")
      .eq("lesson_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/app" className="text-sm text-indigo-600">← Voltar</Link>
          <h1 className="text-2xl font-semibold mt-1">{lesson.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">
              {new Date(lesson.scheduled_at).toLocaleString("pt-BR")} · {lesson.duration_minutes} min ·{" "}
              com {lesson.teacher?.full_name} / {lesson.student?.full_name}
            </p>
            {lesson.status === "cancelled" && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Cancelada</span>}
            {lesson.status === "completed" && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Concluída</span>}
            {lesson.status === "rescheduled" && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">Remarcada</span>}
            {lesson.status === "live" && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Ao vivo</span>}
          </div>
          {lesson.description && <p className="text-slate-700 mt-2">{lesson.description}</p>}
          {lesson.summary && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-800 mb-1">Resumo da aula</p>
              <p className="text-sm text-green-900 whitespace-pre-wrap">{lesson.summary}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BoardLauncher
            lessonId={lesson.id}
            currentUserId={user.id}
            isTeacher={isTeacher}
            lessonActive={lesson.status !== "completed" && lesson.status !== "cancelled"}
            initialAllowed={lesson.board_student_allowed}
          />
          <LessonChat
            lessonId={lesson.id}
            currentUserId={user.id}
            otherUserId={isTeacher ? lesson.student_id : lesson.teacher_id}
            otherName={(isTeacher ? lesson.student?.full_name : lesson.teacher?.full_name) ?? "Contato"}
          />
          {isTeacher && (
            <LessonActions
              lessonId={lesson.id}
              studentId={lesson.student_id}
              initial={{
                title: lesson.title,
                description: lesson.description,
                scheduled_at: lesson.scheduled_at,
                duration_minutes: lesson.duration_minutes,
                status: lesson.status,
                summary: lesson.summary,
              }}
            />
          )}
        </div>
      </div>

      <LessonRoom
        lessonId={lesson.id}
        scheduledAt={lesson.scheduled_at}
        durationMinutes={lesson.duration_minutes}
        status={lesson.status}
        isTeacher={isTeacher}
        recordingActive={lesson.recording_status === "recording"}
      />

      {lesson.recording_path && lesson.recording_status === "done" && (
        <RecordingSection path={lesson.recording_path} lessonId={lesson.id} isTeacher={isTeacher} transcript={lesson.transcript} />
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Materiais</h2>
          <LessonFiles lessonId={lesson.id} currentUserId={user.id} isTeacher={isTeacher} initial={files ?? []} />
        </section>

        <section className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Lição de casa</h2>
          <LessonHomework
            lessonId={lesson.id}
            currentUserId={user.id}
            isTeacher={isTeacher}
            studentId={lesson.student_id}
            initial={homeworks ?? []}
          />
        </section>
      </div>

      <section className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">Comentários e anotações</h2>
        <LessonComments lessonId={lesson.id} initial={comments ?? []} />
      </section>
    </div>
  );
}
