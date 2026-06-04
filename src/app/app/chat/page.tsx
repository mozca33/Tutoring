import { createClient } from "@/lib/supabase/server";
import MessagesView, { type Conversation } from "./messages-view";

type Person = { id: string; full_name: string; role: string; avatar_url: string | null };
type Rel = { teacher: Person | null; student: Person | null };

export default async function ChatListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rels } = await supabase
    .from("relationships")
    .select("teacher:teacher_id(id, full_name, role, avatar_url), student:student_id(id, full_name, role, avatar_url)")
    .returns<Rel[]>();

  // "Outro" lado de cada relação (independente de papel).
  const others: Person[] = [];
  for (const r of rels ?? []) {
    const other = r.teacher?.id === user.id ? r.student : r.teacher;
    if (other && !others.some((o) => o.id === other.id)) others.push(other);
  }

  const convos: Conversation[] = [];
  for (const o of others) {
    const { data: last } = await supabase
      .from("messages")
      .select("content, created_at, sender_id, kind")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${o.id}),and(sender_id.eq.${o.id},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    convos.push({
      id: o.id,
      name: o.full_name,
      role: o.role,
      avatarUrl: o.avatar_url,
      last: last ? { content: last.content, created_at: last.created_at, sender_id: last.sender_id, kind: last.kind ?? "text" } : null,
    });
  }

  convos.sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));

  return <MessagesView currentUserId={user.id} conversations={convos} />;
}
