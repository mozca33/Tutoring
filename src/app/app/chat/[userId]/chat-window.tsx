"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
};

export default function ChatWindow({
  currentUserId,
  otherUserId,
  initial,
}: {
  currentUserId: string;
  otherUserId: string;
  initial: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${[currentUserId, otherUserId].sort().join(":")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const inThisConvo =
            (m.sender_id === currentUserId && m.recipient_id === otherUserId) ||
            (m.sender_id === otherUserId && m.recipient_id === currentUserId);
          if (!inThisConvo) return;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: currentUserId, recipient_id: otherUserId, content: text.trim() })
      .select("id, sender_id, recipient_id, content, created_at")
      .single();
    setSending(false);
    if (error || !data) return;
    setMessages((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data]));
    setText("");
  }

  return (
    <div className="bg-white border rounded-xl flex flex-col" style={{ height: "65vh" }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-slate-400 text-center mt-8">Nenhuma mensagem. Diga olá!</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-md px-3 py-2 rounded-2xl ${mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-indigo-100" : "text-slate-500"}`}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="border-t p-3 flex gap-2">
        <input className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Digite uma mensagem..."
          value={text} onChange={(e) => setText(e.target.value)} />
        <button disabled={sending} className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
          Enviar
        </button>
      </form>
    </div>
  );
}
