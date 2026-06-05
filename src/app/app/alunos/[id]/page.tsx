import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarPlus, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { statusInfo } from "@/lib/lesson";

type LessonRow = { id: string; title: string; scheduled_at: string; status: string };
type HwRow = { id: string; title: string; submitted_at: string | null; grade: string | null };

export default async function AlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Confirma vínculo professor → aluno
  const { data: rel } = await supabase.from("relationships")
    .select("id").eq("teacher_id", user.id).eq("student_id", id).maybeSingle();
  if (!rel) notFound();

  const { data: student } = await supabase.from("profiles")
    .select("id, full_name, email, avatar_url, invited_pending").eq("id", id).single<{ id: string; full_name: string; email: string | null; avatar_url: string | null; invited_pending: boolean }>();
  if (!student) notFound();

  const [{ data: lessons }, { data: homeworks }] = await Promise.all([
    supabase.from("lessons").select("id, title, scheduled_at, status").eq("teacher_id", user.id).eq("student_id", id).order("scheduled_at", { ascending: false }).returns<LessonRow[]>(),
    supabase.from("homeworks").select("id, title, submitted_at, grade").eq("teacher_id", user.id).eq("student_id", id).order("created_at", { ascending: false }).returns<HwRow[]>(),
  ]);

  const ls = lessons ?? [];
  const hw = homeworks ?? [];
  const completed = ls.filter((l) => l.status === "completed").length;
  const upcoming = ls.filter((l) => l.status !== "cancelled" && l.status !== "completed" && new Date(l.scheduled_at).getTime() >= Date.now());
  const pendingHw = hw.filter((h) => !h.submitted_at).length;
  const gradedHw = hw.filter((h) => h.grade).length;

  const initials = student.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/app/contatos" className="text-sm text-indigo-600 dark:text-indigo-400">← Meus alunos</Link>

      <div className="flex items-center gap-4 flex-wrap">
        {student.avatar_url
          ? <Image src={student.avatar_url} alt={student.full_name} width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
          : <span className="h-16 w-16 rounded-full bg-indigo-600 text-white grid place-items-center text-xl font-semibold">{initials || "?"}</span>}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold flex items-center gap-2">{student.full_name}
            {student.invited_pending && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium">Pendente</span>}
          </h1>
          <p className="text-muted text-sm">{student.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/app?aluno=${student.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium transition-colors"><CalendarPlus size={16} /> Agendar</Link>
          <Link href={`/app/chat/${student.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border hover:bg-surface px-4 py-2 text-sm font-medium transition-colors"><MessageSquare size={16} /> Mensagem</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Aulas" value={ls.length} />
        <Metric label="Concluídas" value={completed} />
        <Metric label="Próximas" value={upcoming.length} />
        <Metric label="Lições pendentes" value={pendingHw} sub={`${gradedHw} corrigidas`} />
      </div>

      <section className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Aulas</h2>
        {ls.length === 0 ? <p className="text-sm text-muted">Nenhuma aula ainda.</p> : (
          <ul className="divide-y divide-border">
            {ls.slice(0, 20).map((l) => {
              const st = statusInfo(l.status);
              return (
                <li key={l.id}>
                  <Link href={`/app/lessons/${l.id}`} className="flex items-center justify-between gap-2 py-2 hover:bg-background -mx-2 px-2 rounded transition-colors">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{l.title}</span>
                      <span className="block text-xs text-muted">{new Date(l.scheduled_at).toLocaleString("pt-BR")}</span>
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${st.chip}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Lição de casa</h2>
        {hw.length === 0 ? <p className="text-sm text-muted">Nenhuma.</p> : (
          <ul className="space-y-2">
            {hw.slice(0, 20).map((h) => (
              <li key={h.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2">
                <span className="truncate">{h.title}</span>
                <span className={`text-xs shrink-0 ${h.grade ? "text-emerald-600 dark:text-emerald-400" : h.submitted_at ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {h.grade ? `Nota ${h.grade}` : h.submitted_at ? "Entregue" : "Pendente"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
