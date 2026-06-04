"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageSquare, Search } from "lucide-react";
import ChatConversation from "./chat-conversation";

export type Conversation = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  last: { content: string; created_at: string; sender_id: string; kind: string } | null;
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function MessagesView({ currentUserId, conversations }: { currentUserId: string; conversations: Conversation[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lastSeen] = useState(() => (typeof window !== "undefined" ? Number(localStorage.getItem("notif_seen") || 0) : 0));

  const filtered = conversations.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const current = conversations.find((c) => c.id === selected) ?? null;

  function preview(c: Conversation) {
    if (!c.last) return "Nenhuma mensagem ainda";
    const base = c.last.kind === "event" ? c.last.content : (c.last.sender_id === currentUserId ? "Você: " : "") + c.last.content;
    return base.replace(/@\[([^\]]+)\]\(lesson:[0-9a-fA-F-]+\)/g, "$1");
  }
  function unread(c: Conversation) {
    return !!c.last && c.last.sender_id !== currentUserId && new Date(c.last.created_at).getTime() > lastSeen;
  }

  function avatar(c: Conversation) {
    if (c.avatarUrl) return <Image src={c.avatarUrl} alt={c.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover shrink-0" />;
    const initials = c.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    return <span className="h-10 w-10 shrink-0 rounded-full bg-indigo-600 text-white grid place-items-center text-sm font-semibold">{initials || "?"}</span>;
  }

  return (
    <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-4" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Lista (master) */}
      <div className={`${selected ? "hidden lg:flex" : "flex"} flex-col min-h-0`}>
        <h1 className="text-2xl font-semibold mb-3">Mensagens</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conversa…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 ? (
            <p className="text-muted text-sm p-3">Nenhuma conversa. Convide um aluno em <strong>Meus Alunos</strong>.</p>
          ) : filtered.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`w-full text-left rounded-lg p-3 flex items-center gap-3 transition-colors ${selected === c.id ? "bg-indigo-50 dark:bg-indigo-950" : "hover:bg-surface"}`}>
              {avatar(c)}
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate ${unread(c) ? "font-semibold" : "font-medium"}`}>{c.name}</span>
                  {c.last && <span className="text-[11px] text-muted shrink-0">{timeLabel(c.last.created_at)}</span>}
                </span>
                <span className={`block text-xs truncate ${unread(c) ? "text-foreground font-medium" : "text-muted"}`}>{preview(c)}</span>
              </span>
              {unread(c) && <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Detalhe */}
      <div className={`${selected ? "flex" : "hidden lg:flex"} flex-col min-h-0`}>
        {current ? (
          <ChatConversation currentUserId={currentUserId} other={current} onBack={() => setSelected(null)} />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-muted">
            <div className="text-center"><MessageSquare className="mx-auto mb-2" size={28} /><p className="text-sm">Selecione uma conversa</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
