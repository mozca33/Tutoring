"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, MessageSquare, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; title: string; preview: string; href: string; isEvent: boolean; created_at: string };

function previewOf(content: string) {
  return content.replace(/@\[([^\]]+)\]\(lesson:[0-9a-fA-F-]+\)/g, "$1").slice(0, 80);
}

export default function NotificationsBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);

  useEffect(() => { setLastSeen(Number(localStorage.getItem("notif_seen") || 0)); }, []);

  useEffect(() => {
    const supabase = createClient();

    async function toItem(m: { id: string; sender_id: string; content: string; kind?: string; event_type?: string; lesson_id?: string; created_at: string }): Promise<Item> {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", m.sender_id).single();
      const isEvent = m.kind === "event";
      const href = isEvent
        ? (m.event_type === "completed" ? `/app/materiais?aula=${m.lesson_id}` : `/app/lessons/${m.lesson_id}`)
        : `/app/chat/${m.sender_id}`;
      return { id: m.id, title: isEvent ? "Atualização de aula" : (p?.full_name ?? "Mensagem"), preview: previewOf(m.content), href, isEvent, created_at: m.created_at };
    }

    (async () => {
      const { data } = await supabase.from("messages")
        .select("id, sender_id, content, kind, event_type, lesson_id, created_at")
        .eq("recipient_id", userId).order("created_at", { ascending: false }).limit(20);
      if (!data) return;
      // Busca todos os perfis dos remetentes em UMA query (evita N+1).
      const ids = [...new Set(data.map((m) => m.sender_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      setItems(data.map((m) => {
        const isEvent = m.kind === "event";
        const href = isEvent
          ? (m.event_type === "completed" ? `/app/materiais?aula=${m.lesson_id}` : `/app/lessons/${m.lesson_id}`)
          : `/app/chat/${m.sender_id}`;
        return { id: m.id, title: isEvent ? "Atualização de aula" : (nameById.get(m.sender_id) ?? "Mensagem"), preview: previewOf(m.content), href, isEvent, created_at: m.created_at };
      }));
    })();

    const ch = supabase.channel(`bell:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` }, async (payload) => {
        const m = payload.new as { id: string; sender_id: string; content: string; kind?: string; event_type?: string; lesson_id?: string; created_at: string };
        if (m.sender_id === userId) return;
        const it = await toItem(m);
        setItems((prev) => prev.some((x) => x.id === it.id) ? prev : [it, ...prev].slice(0, 20));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const unread = items.filter((i) => new Date(i.created_at).getTime() > lastSeen).length;

  function openPanel() {
    setOpen(true);
    const now = Date.now();
    setLastSeen(now);
    try { localStorage.setItem("notif_seen", String(now)); } catch {}
  }

  return (
    <div className="relative">
      <button onClick={() => (open ? setOpen(false) : openPanel())} aria-label="Notificações"
        className="relative inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] grid place-items-center">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 max-h-96 overflow-y-auto bg-surface border border-border rounded-xl shadow-xl">
            <p className="px-3 py-2 text-sm font-medium border-b border-border">Notificações</p>
            {items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">Nada por aqui ainda.</p>
            ) : items.map((it) => (
              <button key={it.id} onClick={() => { setOpen(false); router.push(it.href); }}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-background transition-colors border-b border-border last:border-0">
                <span className={`h-7 w-7 shrink-0 rounded-full text-white grid place-items-center ${it.isEvent ? "bg-violet-600" : "bg-indigo-600"}`}>
                  {it.isEvent ? <CalendarClock size={14} /> : <MessageSquare size={14} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{it.title}</span>
                  <span className="block text-xs text-muted truncate">{it.preview}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
