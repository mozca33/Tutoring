import { createClient } from "@/lib/supabase/server";
import AddContactForm from "./add-contact-form";
import RemoveContactButton from "./remove-contact-button";

type Rel = {
  id: string;
  teacher: { id: string; full_name: string; email: string | null } | null;
  student: { id: string; full_name: string; email: string | null } | null;
};

export default async function ContatosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  const isTeacher = profile?.role === "teacher";

  const { data: rels } = await supabase
    .from("relationships")
    .select("id, teacher:teacher_id(id, full_name, email), student:student_id(id, full_name, email)")
    .returns<Rel[]>();

  const contacts = (rels ?? []).map((r) => isTeacher ? r.student : r.teacher).filter(Boolean);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Contatos</h1>
        <p className="text-slate-500">
          {isTeacher ? "Seus alunos vinculados." : "Seus professores."}
        </p>
      </header>

      {isTeacher && (
        <section className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Adicionar aluno</h2>
          <AddContactForm />
          <p className="text-xs text-slate-500 mt-2">
            O aluno precisa ter criado conta antes (e estar marcado como "aluno").
          </p>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">{isTeacher ? "Meus alunos" : "Meus professores"}</h2>
        {contacts.length === 0 ? (
          <p className="text-slate-500">Nenhum contato ainda.</p>
        ) : (
          <ul className="grid gap-3">
            {(rels ?? []).map((r) => {
              const other = isTeacher ? r.student : r.teacher;
              if (!other) return null;
              return (
                <li key={r.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{other.full_name}</p>
                    <p className="text-sm text-slate-500">{other.email}</p>
                  </div>
                  {isTeacher && <RemoveContactButton relationshipId={r.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
