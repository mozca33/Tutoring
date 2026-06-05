import { createClient } from "@/lib/supabase/server";
import MessagesView, { type Conversation } from "./messages-view";

type Person = { id: string; full_name: string; role: string; avatar_url: string | null; last_seen_at: string | null };
type Rel = { teacher: Person | null; student: Person | null };

export default async function ChatListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rels } = await supabase
    .from("relationships")
    .select("teacher:teacher_id(id, full_name, role, avatar_url, last_seen_at), student:student_id(id, full_name, role, avatar_url, last_seen_at)")
    .returns<Rel[]>();

  // "Outro" lado de cada relação (independente de papel).
  const others: Person[] = [];
  for (const r of rels ?? []) {
    const other = r.teacher?.id === user.id ? r.student : r.teacher;
    if (other && !others.some((o) => o.id === other.id)) others.push(other);
  }

  // Estado por conversa (lido/fixado/arquivado) do usuário atual.
  const { data: states } = await supabase
    .from("conversation_state")
    .select("peer_id, last_read_at, pinned, archived")
    .eq("user_id", user.id);
  const stateMap = new Map((states ?? []).map((s) => [s.peer_id, s]));

  const convos: Conversation[] = [];
  for (const o of others) {
    const st = stateMap.get(o.id);
    const { data: last } = await supabase
      .from("messages")
      .select("content, created_at, sender_id, kind")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${o.id}),and(sender_id.eq.${o.id},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Não lidas = mensagens recebidas após o último "lido" no servidor.
    let unread = 0;
    if (last && last.sender_id !== user.id) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("sender_id", o.id)
        .gt("created_at", st?.last_read_at ?? "1970-01-01T00:00:00Z");
      unread = count ?? 0;
    }

    convos.push({
      id: o.id,
      name: o.full_name,
      role: o.role,
      avatarUrl: o.avatar_url,
      lastSeenAt: o.last_seen_at,
      pinned: !!st?.pinned,
      archived: !!st?.archived,
      unread,
      last: last ? { content: last.content, created_at: last.created_at, sender_id: last.sender_id, kind: last.kind ?? "text" } : null,
    });
  }

  // Fixadas primeiro; depois por mensagem mais recente.
  convos.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? "");
  });

  return <MessagesView currentUserId={user.id} conversations={convos} />;
}
