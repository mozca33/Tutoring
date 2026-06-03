import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MaterialsList, { type MaterialGroup } from "./materials-list";

type FileRow = { id: string; file_name: string; storage_path: string; size_bytes: number | null; created_at: string };
type LessonWithFiles = { id: string; title: string; scheduled_at: string; lesson_files: FileRow[] };

const statusLabel: Record<string, string> = {
  scheduled: "Agendada", rescheduled: "Remarcada", live: "Ao vivo", completed: "Concluída", cancelled: "Cancelada",
};

export default async function MateriaisPage({ searchParams }: { searchParams: Promise<{ aula?: string }> }) {
  const { aula } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // ===== Visão de UMA aula =====
  if (aula) {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, scheduled_at, status, summary, lesson_files(id, file_name, storage_path, size_bytes, created_at)")
      .eq("id", aula)
      .single<{ id: string; title: string; scheduled_at: string; status: string; summary: string | null; lesson_files: FileRow[] }>();

    if (!lesson) {
      return <p className="text-muted">Aula não encontrada.</p>;
    }

    const [{ data: homeworks }, { data: comments }, { count: annCount }] = await Promise.all([
      supabase.from("homeworks").select("id, title, submitted_at, grade").eq("lesson_id", aula),
      supabase.from("lesson_comments").select("id, content, created_at, author:author_id(full_name)").eq("lesson_id", aula).order("created_at")
        .returns<{ id: string; content: string; created_at: string; author: { full_name: string } | null }[]>(),
      supabase.from("file_annotations").select("id", { count: "exact", head: true })
        .in("file_id", (lesson.lesson_files ?? []).map((f) => f.id).length ? (lesson.lesson_files ?? []).map((f) => f.id) : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const group: MaterialGroup[] = (lesson.lesson_files ?? []).length
      ? [{ lessonId: lesson.id, lessonTitle: lesson.title, scheduledAt: lesson.scheduled_at,
           files: [...lesson.lesson_files].sort((a, b) => b.created_at.localeCompare(a.created_at)) }]
      : [];

    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <Link href="/app/materiais" className="text-sm text-indigo-600 dark:text-indigo-400">← Todos os materiais</Link>
          <h1 className="text-2xl font-semibold mt-1">{lesson.title}</h1>
          <p className="text-sm text-muted">
            {new Date(lesson.scheduled_at).toLocaleString("pt-BR")} · {statusLabel[lesson.status] ?? lesson.status}
            {" · "}<Link href={`/app/lessons/${lesson.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">abrir aula</Link>
          </p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Materiais" value={(lesson.lesson_files ?? []).length} />
          <Metric label="Anotações" value={annCount ?? 0} />
          <Metric label="Lições" value={(homeworks ?? []).length} />
        </div>

        {lesson.summary && (
          <section className="bg-surface border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-1">Resumo da aula</h2>
            <p className="text-sm whitespace-pre-wrap text-muted">{lesson.summary}</p>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Materiais</h2>
          <MaterialsList groups={group} currentUserId={user.id} />
        </section>

        <section className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Lição de casa</h2>
          {(homeworks ?? []).length === 0 ? <p className="text-sm text-muted">Nenhuma.</p> : (
            <ul className="space-y-2">
              {(homeworks ?? []).map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2">
                  <span>{h.title}</span>
                  <span className="text-muted">{h.grade ? `Nota ${h.grade}` : h.submitted_at ? "Entregue" : "Pendente"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Comentários e anotações</h2>
          {(comments ?? []).length === 0 ? <p className="text-sm text-muted">Nenhum comentário.</p> : (
            <ul className="space-y-3">
              {(comments ?? []).map((c) => (
                <li key={c.id} className="border-l-2 border-indigo-300 dark:border-indigo-800 pl-3">
                  <p className="text-xs text-muted">{c.author?.full_name} · {new Date(c.created_at).toLocaleString("pt-BR")}</p>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // ===== Visão de TODAS as aulas =====
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, scheduled_at, lesson_files(id, file_name, storage_path, size_bytes, created_at)")
    .order("scheduled_at", { ascending: false })
    .returns<LessonWithFiles[]>();

  const groups: MaterialGroup[] = (lessons ?? [])
    .filter((l) => l.lesson_files.length > 0)
    .map((l) => ({
      lessonId: l.id, lessonTitle: l.title, scheduledAt: l.scheduled_at,
      files: [...l.lesson_files].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Materiais</h1>
        <p className="text-muted">Todos os arquivos das suas aulas em um só lugar.</p>
      </header>
      <MaterialsList groups={groups} currentUserId={user.id} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
