"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, CalendarClock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Toast = {
  id: string;
  title: string;
  preview: string;
  href: string;
  isEvent: boolean;
};

export default function MessageNotifier({ userId }: { userId: string }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notify:${userId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        async (payload) => {
          const m = payload.new as { id: string; sender_id: string; content: string; kind?: string; event_type?: string; lesson_id?: string };
          if (m.sender_id === userId) return;
          const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", m.sender_id).single();
          const name = prof?.full_name ?? "Notificação";
          const isEvent = m.kind === "event";
          const preview = m.content.replace(/@\[([^\]]+)\]\(lesson:[0-9a-fA-F-]+\)/g, "$1").slice(0, 90);
          const href = isEvent
            ? (m.event_type === "completed" ? `/app/materiais?aula=${m.lesson_id}` : `/app/lessons/${m.lesson_id}`)
            : `/app/chat/${m.sender_id}`;
          const t: Toast = { id: m.id, title: isEvent ? "Atualização de aula" : name, preview, href, isEvent };
          setToasts((prev) => [...prev, t]);
          setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 7000);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <button key={t.id}
          onClick={() => { setToasts((prev) => prev.filter((x) => x.id !== t.id)); router.push(t.href); }}
          className="w-full text-left bg-surface border border-border rounded-xl shadow-xl p-3 flex items-start gap-3 hover:bg-background transition-colors">
          <span className={`h-9 w-9 shrink-0 rounded-full text-white grid place-items-center ${t.isEvent ? "bg-violet-600" : "bg-indigo-600"}`}>
            {t.isEvent ? <CalendarClock size={16} /> : <MessageSquare size={16} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium truncate">{t.title}</span>
            <span className="block text-xs text-muted truncate">{t.preview}</span>
          </span>
          <X size={16} className="text-muted shrink-0" onClick={(e) => { e.stopPropagation(); setToasts((prev) => prev.filter((x) => x.id !== t.id)); }} />
        </button>
      ))}
    </div>
  );
}
