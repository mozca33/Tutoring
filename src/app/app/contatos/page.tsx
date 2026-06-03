import { createClient } from "@/lib/supabase/server";
import AddContactForm from "./add-contact-form";
import RemoveContactButton from "./remove-contact-button";

type Person = { id: string; full_name: string; email: string | null };
type Rel = {
  id: string;
  teacher: Person | null;
  student: Person | null;
};

export default async function ContatosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("role, teacher_code").eq("id", user.id).single();
  const isTeacher = profile?.role === "teacher";

  const { data: rels } = await supabase
    .from("relationships")
    .select("id, teacher:teacher_id(id, full_name, email), student:student_id(id, full_name, email)")
    .returns<Rel[]>();

  // Separa pelos lados reais — um professor pode ser aluno de outro professor.
  const teaching = (rels ?? []).filter((r) => r.teacher?.id === user.id); // contatos = meus alunos
  const learning = (rels ?? []).filter((r) => r.student?.id === user.id); // contatos = meus professores

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Contatos</h1>
        <p className="text-muted">Pessoas vinculadas a você.</p>
      </header>

      {isTeacher && (
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Seu código de professor</h2>
            <p className="text-sm text-muted mb-2">Compartilhe com seus alunos: eles se cadastram informando este código.</p>
            <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2">
              <span className="font-mono text-xl tracking-[0.3em] font-semibold text-indigo-700 dark:text-indigo-300">{profile?.teacher_code ?? "—"}</span>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="font-medium mb-2">Adicionar aluno por e-mail</h3>
            <AddContactForm />
            <p className="text-xs text-muted mt-2">
              Alternativa ao código: informe o e-mail de alguém que já tenha conta (aluno ou outro professor).
            </p>
          </div>
        </section>
      )}

      {(isTeacher || teaching.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Meus alunos</h2>
          {teaching.length === 0 ? (
            <p className="text-muted">Nenhum aluno vinculado ainda.</p>
          ) : (
            <ul className="grid gap-3">
              {teaching.map((r) => r.student && (
                <li key={r.id} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.student.full_name}</p>
                    <p className="text-sm text-muted">{r.student.email}</p>
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
