import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RemoveContactButton from "./remove-contact-button";
import ResendInviteButton from "./resend-invite-button";
import InviteStudentModal from "./invite-student-modal";

type Person = { id: string; full_name: string; email: string | null; invited_pending?: boolean };
type Rel = { id: string; teacher: Person | null; student: Person | null };

export default async function ContatosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isTeacher = profile?.role === "teacher";

  const { data: rels } = await supabase
    .from("relationships")
    .select("id, teacher:teacher_id(id, full_name, email), student:student_id(id, full_name, email, invited_pending)")
    .returns<Rel[]>();

  const teaching = (rels ?? []).filter((r) => r.teacher?.id === user.id);
  const learning = (rels ?? []).filter((r) => r.student?.id === user.id);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Meus alunos</h1>
          <p className="text-muted">Pessoas vinculadas a você.</p>
        </div>
        {isTeacher && <InviteStudentModal />}
      </header>

      {(isTeacher || teaching.length > 0) && (
        <section>
          {teaching.length === 0 ? (
            <p className="text-muted">Nenhum aluno ainda. Use o botão <strong>Convidar aluno</strong>.</p>
          ) : (
            <ul className="grid gap-3">
              {teaching.map((r) => r.student && (
                <li key={r.id} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between gap-3">
                  <Link href={`/app/chat/${r.student.id}`} className="min-w-0 group flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{r.student.full_name}</p>
                      {r.student.invited_pending && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium shrink-0">Pendente</span>}
                      <MessageSquare size={14} className="text-muted shrink-0" />
                    </div>
                    <p className="text-sm text-muted truncate">{r.student.email}</p>
                  </Link>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <RemoveContactButton relationshipId={r.id} />
                    {r.student.invited_pending && <ResendInviteButton studentId={r.student.id} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {learning.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Meus professores</h2>
          <ul className="grid gap-3">
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
