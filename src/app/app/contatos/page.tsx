import Link from "next/link";
import Image from "next/image";
import { CalendarPlus, MessageSquare, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RemoveContactButton from "./remove-contact-button";
import ResendInviteButton from "./resend-invite-button";
import InviteStudentModal from "./invite-student-modal";

type Person = { id: string; full_name: string; email: string | null; avatar_url: string | null; invited_pending?: boolean };
type Rel = { id: string; teacher: Person | null; student: Person | null };

export default async function ContatosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isTeacher = profile?.role === "teacher";

  const { data: rels } = await supabase
    .from("relationships")
    .select("id, teacher:teacher_id(id, full_name, email, avatar_url), student:student_id(id, full_name, email, avatar_url, invited_pending)")
    .returns<Rel[]>();

  const teaching = (rels ?? []).filter((r) => r.teacher?.id === user.id);
  const learning = (rels ?? []).filter((r) => r.student?.id === user.id);

  // Stats agregadas por aluno (uma leitura cada).
  const [{ data: lessons }, { data: homeworks }] = await Promise.all([
    supabase.from("lessons").select("student_id, scheduled_at, status").eq("teacher_id", user.id),
    supabase.from("homeworks").select("student_id, submitted_at").eq("teacher_id", user.id),
  ]);

  const now = Date.now();
  function statsFor(studentId: string) {
    const ls = (lessons ?? []).filter((l) => l.student_id === studentId);
    const upcoming = ls
      .filter((l) => l.status !== "cancelled" && l.status !== "completed" && new Date(l.scheduled_at).getTime() >= now)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
    const pendingHw = (homeworks ?? []).filter((h) => h.student_id === studentId && !h.submitted_at).length;
    return { total: ls.length, next: upcoming ? new Date(upcoming.scheduled_at) : null, pendingHw };
  }

  const pendingInvites = teaching.filter((r) => r.student?.invited_pending).length;

  function initials(name: string) {
    return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Meus alunos</h1>
          <p className="text-muted">
            {teaching.length} aluno{teaching.length === 1 ? "" : "s"}
            {pendingInvites > 0 && ` · ${pendingInvites} convite${pendingInvites === 1 ? "" : "s"} pendente${pendingInvites === 1 ? "" : "s"}`}
          </p>
        </div>
        {isTeacher && <InviteStudentModal />}
      </header>

      {(isTeacher || teaching.length > 0) && (
        teaching.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center">
            <GraduationCap size={32} className="mx-auto text-muted mb-2" />
            <p className="font-medium">Você ainda não tem alunos</p>
            <p className="text-sm text-muted mt-1">Use o botão <strong>Convidar aluno</strong> para começar.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teaching.map((r) => r.student && (() => {
              const s = r.student!;
              const st = statsFor(s.id);
              return (
                <div key={r.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
                  <Link href={`/app/alunos/${s.id}`} className="flex items-center gap-3 min-w-0 group">
                    {s.avatar_url
                      ? <Image src={s.avatar_url} alt={s.full_name} width={44} height={44} className="h-11 w-11 rounded-full object-cover shrink-0" />
                      : <span className="h-11 w-11 shrink-0 rounded-full bg-indigo-600 text-white grid place-items-center font-semibold">{initials(s.full_name)}</span>}
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s.full_name}</span>
                        {s.invited_pending && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium shrink-0">Pendente</span>}
                      </span>
                      <span className="block text-xs text-muted truncate">{s.email}</span>
                    </span>
                  </Link>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-background py-1.5">
                      <p className="text-sm font-semibold">{st.total}</p>
                      <p className="text-[10px] text-muted">Aulas</p>
                    </div>
                    <div className="rounded-lg bg-background py-1.5">
                      <p className="text-sm font-semibold">{st.next ? st.next.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—"}</p>
                      <p className="text-[10px] text-muted">Próxima</p>
                    </div>
                    <div className="rounded-lg bg-background py-1.5">
                      <p className="text-sm font-semibold">{st.pendingHw}</p>
                      <p className="text-[10px] text-muted">Lições pend.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Link href={`/app?aluno=${s.id}`} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 text-xs font-medium transition-colors">
                      <CalendarPlus size={14} /> Agendar
                    </Link>
                    <Link href={`/app/chat/${s.id}`} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border hover:bg-background py-1.5 text-xs font-medium transition-colors">
                      <MessageSquare size={14} /> Mensagem
                    </Link>
                    <RemoveContactButton relationshipId={r.id} />
                  </div>
                  {s.invited_pending && <ResendInviteButton studentId={s.id} />}
                </div>
              );
            })())}
          </div>
        )
      )}

      {learning.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Meus professores</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {learning.map((r) => r.teacher && (
              <li key={r.id} className="bg-surface border border-border rounded-lg p-4">
                <Link href={`/app/chat/${r.teacher.id}`} className="group">
                  <p className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{r.teacher.full_name}</p>
                  <p className="text-sm text-muted">{r.teacher.email}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
