"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ChatWindow from "./[userId]/chat-window";
import type { Conversation } from "./messages-view";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Msg = any;

export default function ChatConversation({
  currentUserId, other, onBack,
}: {
  currentUserId: string;
  other: Conversation;
  onBack: () => void;
}) {
  const [initial, setInitial] = useState<Msg[] | null>(null);

  useEffect(() => {
    setInitial(null);
    const supabase = createClient();
    supabase.from("messages")
      .select("id, sender_id, recipient_id, content, created_at, kind, lesson_id, event_type, justification")
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true })
      .then(({ data }) => setInitial(data ?? []));
  }, [other.id, currentUserId]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-surface text-foreground" aria-label="Voltar"><ChevronLeft size={20} /></button>
        <div className="min-w-0">
          <p className="font-semibold truncate">{other.name}</p>
          <p className="text-xs text-muted">{other.role === "teacher" ? "Professor" : "Aluno"}</p>
        </div>
      </div>
      {initial === null ? (
        <div className="flex-1 grid place-items-center text-muted text-sm">Carregando…</div>
      ) : (
        <div className="flex-1 min-h-0">
          <ChatWindow currentUserId={currentUserId} otherUserId={other.id} initial={initial} />
        </div>
      )}
    </div>
  );
}
