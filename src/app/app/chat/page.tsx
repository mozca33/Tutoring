import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Rel = {
  teacher: { id: string; full_name: string } | null;
  student: { id: string; full_name: string } | null;
};

export default async function ChatListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  const isTeacher = profile?.role === "teacher";

  const { data: rels } = await supabase
    .from("relationships")
    .select("teacher:teacher_id(id, full_name), student:student_id(id, full_name)")
    .returns<Rel[]>();

  const contacts = (rels ?? [])
    .map((r) => (isTeacher ? r.student : r.teacher))
    .filter((c): c is { id: string; full_name: string } => !!c);

  const lastMessages: Record<string, { content: string; created_at: string; sender_id: string }> = {};
  for (const c of contacts) {
    const { data } = await supabase
      .from("messages")
      .select("content, created_at, sender_id")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${c.id}),` +
        `and(sender_id.eq.${c.id},recipient_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) lastMessages[c.id] = data;
  }

  const sorted = [...contacts].sort((a, b) => {
    const ta = lastMessages[a.id]?.created_at ?? "";
    const tb = lastMessages[b.id]?.created_at ?? "";
    return tb.localeCompare(ta);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mensagens</h1>
      {sorted.length === 0 ? (
        <p className="text-slate-500">
          Você ainda não tem contatos. Vá em <Link href="/app/contatos" className="text-indigo-600">Contatos</Link>.
        </p>
      ) : (
        <ul className="grid gap-2">
          {sorted.map((c) => {
            const last = lastMessages[c.id];
            return (
              <li key={c.id}>
                <Link href={`/app/chat/${c.id}`}
                  className="block bg-white border rounded-lg p-4 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.full_name}</p>
                    {last && (
                      <p className="text-xs text-slate-400">
                        {new Date(last.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate mt-1">
                    {last
                      ? `${last.sender_id === user.id ? "Você: " : ""}${last.content}`
                      : "Nenhuma mensagem ainda"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
