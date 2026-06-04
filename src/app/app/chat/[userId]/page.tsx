import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatWindow from "./chat-window";

export default async function ChatPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: other } = await supabase
    .from("profiles").select("id, full_name, role").eq("id", userId).single();
  if (!other) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, content, created_at, kind, lesson_id, event_type, justification")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${userId}),` +
      `and(sender_id.eq.${userId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-4">
      <Link href="/app/chat" className="text-sm text-indigo-600">← Mensagens</Link>
      <header>
        <h1 className="text-2xl font-semibold">{other.full_name}</h1>
        <p className="text-sm text-slate-500">{other.role === "teacher" ? "Professor" : "Aluno"}</p>
      </header>
      <div className="h-[70vh]">
        <ChatWindow currentUserId={user.id} otherUserId={userId} initial={messages ?? []} />
      </div>
    </div>
  );
}
