"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  lesson_id?: string | null;
  kind?: string | null;
};

function hhmm(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function LessonChat({
  lessonId, currentUserId, otherUserId, otherName,
}: {
  lessonId: string;
  currentUserId: string;
  otherUserId: string;
  otherName: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Message[] | null>(null);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mensagens desta aula
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, content, created_at, lesson_id, kind")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: true })
        .returns<Message[]>();
      setMessages(data ?? []);
    })();
  }, [lessonId]);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`lessonchat:${lessonId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `lesson_id=eq.${lessonId}` },
        (p) => {
          const m = p.new as Message;
          if (m.kind === "event") return; // eventos não entram no chat ao vivo
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          if (!open && m.sender_id !== currentUserId) setUnread((u) => u + 1);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [lessonId, open, currentUserId]);

  useEffect(() => {
    if (open) { setUnread(0); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }
  }, [open, messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: currentUserId, recipient_id: otherUserId, content: text.trim(), lesson_id: lessonId })
      .select("id, sender_id, recipient_id, content, created_at, lesson_id, kind")
      .single();
    setSending(false);
    if (error || !data) return;
    setMessages((prev) => prev.some((x) => x.id === data.id) ? prev : [...prev, data]);
    setText("");
  }

  async function loadHistory() {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, created_at, lesson_id, kind")
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
      .is("lesson_id", null)
      .eq("kind", "text")
      .order("created_at", { ascending: true })
      .returns<Message[]>();
    setHistory(data ?? []);
  }

  const bubbles = (list: Message[]) => list.map((m) => {
    const mine = m.sender_id === currentUserId;
    return (
      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm ${mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"}`}>
          <p className="whitespace-pre-wrap break-words">{m.content}</p>
          <p className={`text-[10px] mt-0.5 ${mine ? "text-indigo-100" : "text-slate-500"}`}>{hhmm(m.created_at)}</p>
        </div>
      </div>
    );
  });

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface transition-colors relative">
        <MessageSquare size={16} /> Mensagens
        {unread > 0 && <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[10px] grid place-items-center">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="fixed right-0 top-0 z-50 h-screen w-full sm:w-96 bg-surface border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="font-semibold">Chat da aula</p>
                <p className="text-xs text-muted">com {otherName}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-muted hover:text-foreground"><X size={20} /></button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {history === null ? (
                <button onClick={loadHistory} className="mx-auto flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  <History size={13} /> Carregar histórico anterior
                </button>
              ) : (
                <>
                  {history.length > 0 && <p className="text-center text-[11px] text-muted">— histórico —</p>}
                  {bubbles(history)}
                  <p className="text-center text-[11px] text-muted">— esta aula —</p>
                </>
              )}
              {messages.length === 0 && history?.length !== undefined && <p className="text-muted text-center text-sm mt-4">Sem mensagens nesta aula ainda.</p>}
              {bubbles(messages)}
            </div>
            <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
              <input className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Mensagem nesta aula…" value={text} onChange={(e) => setText(e.target.value)} />
              <button disabled={sending} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">Enviar</button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
