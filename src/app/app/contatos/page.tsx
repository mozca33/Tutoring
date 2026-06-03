import { createClient } from "@/lib/supabase/server";
import AddContactForm from "./add-contact-form";
import RemoveContactButton from "./remove-contact-button";
import ResendInviteButton from "./resend-invite-button";

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
      <header>
        <h1 className="text-2xl font-semibold">Contatos</h1>
        <p className="text-muted">Pessoas vinculadas a você.</p>
      </header>

      {isTeacher && (
        <section className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-1">Convidar aluno</h2>
          <p className="text-sm text-muted mb-3">Informe o nome e o e-mail. O aluno recebe um link para criar a senha — a conta já fica vinculada a você.</p>
          <AddContactForm />
        </section>
      )}

      {(isTeacher || teaching.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Meus alunos</h2>
          {teaching.length === 0 ? (
            <p className="text-muted">Nenhum aluno ainda. Convide pelo formulário acima.</p>
          ) : (
            <ul className="grid gap-3">
              {teaching.map((r) => r.student && (
                <li key={r.id} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{r.student.full_name}</p>
                      {r.student.invited_pending && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium shrink-0">Pendente</span>}
                    </div>
                    <p className="text-sm text-muted truncate">{r.student.email}</p>
                    {r.student.invited_pending && <ResendInviteButton studentId={r.student.id} />}
                  </div>
                  <RemoveContactButton relationshipId={r.id} />
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
                <p className="font-medium">{r.teacher.full_name}</p>
                <p className="text-sm text-muted">{r.teacher.email}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
