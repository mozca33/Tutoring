import { createClient } from "@/lib/supabase/server";
import MaterialsList, { type MaterialGroup } from "./materials-list";

type LessonWithFiles = {
  id: string;
  title: string;
  scheduled_at: string;
  lesson_files: {
    id: string;
    file_name: string;
    storage_path: string;
    size_bytes: number | null;
    created_at: string;
  }[];
};

export default async function MateriaisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS já restringe às aulas em que o usuário participa.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, scheduled_at, lesson_files(id, file_name, storage_path, size_bytes, created_at)")
    .order("scheduled_at", { ascending: false })
    .returns<LessonWithFiles[]>();

  const groups: MaterialGroup[] = (lessons ?? [])
    .filter((l) => l.lesson_files.length > 0)
    .map((l) => ({
      lessonId: l.id,
      lessonTitle: l.title,
      scheduledAt: l.scheduled_at,
      files: [...l.lesson_files].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Materiais</h1>
        <p className="text-muted">Todos os arquivos das suas aulas em um só lugar.</p>
      </header>
      <MaterialsList groups={groups} />
    </div>
  );
}
