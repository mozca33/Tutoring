"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, Pin, PinOff, Archive, ArchiveRestore, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ChatConversation from "./chat-conversation";

export type Conversation = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  pinned: boolean;
  archived: boolean;
  unread: number;
  last: { content: string; created_at: string; sender_id: string; kind: string } | null;
};

type ContentHit = { peerId: string; snippet: string; created_at: string };

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function lastSeenLabel(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function MessagesView({ currentUserId, conversations }: { currentUserId: string; conversations: Conversation[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [hits, setHits] = useState<ContentHit[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Presença em tempo real + heartbeat de "visto por último".
  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("touch_last_seen");
    const beat = setInterval(() => supabase.rpc("touch_last_seen"), 60000);
    const channel = supabase.channel("online", { config: { presence: { key: currentUserId } } });
    channel
      .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
      .subscribe(async (status) => { if (status === "SUBSCRIBED") await channel.track({ at: Date.now() }); });
    return () => { clearInterval(beat); supabase.removeChannel(channel); };
  }, [currentUserId]);

  // Busca no conteúdo das mensagens (debounce).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits(null); return; }
    const supabase = createClient();
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, content, created_at")
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .ilike("content", `%${q}%`)
        .order("created_at", { ascending: false })
        .limit(40);
      const seen = new Set<string>();
      const out: ContentHit[] = [];
      for (const m of data ?? []) {
        const peerId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id;
        if (seen.has(peerId)) continue;
        seen.add(peerId);
        out.push({ peerId, snippet: m.content, created_at: m.created_at });
      }
      setHits(out);
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  const current = conversations.find((c) => c.id === selected) ?? null;
  const byName = (c: Conversation) => c.name.toLowerCase().includes(query.toLowerCase());

  const visible = useMemo(() => conversations.filter((c) => !c.archived && (query.trim() === "" || byName(c))), [conversations, query]);
  const archived = useMemo(() => conversations.filter((c) => c.archived && (query.trim() === "" || byName(c))), [conversations, query]);

  // Conversas com correspondência no conteúdo (que não bateram pelo nome).
  const contentMatches = useMemo(() => {
    if (!hits) return [];
    return hits
      .map((h) => ({ conv: conversations.find((c) => c.id === h.peerId), snippet: h.snippet }))
      .filter((x): x is { conv: Conversation; snippet: string } => !!x.conv && !byName(x.conv));
  }, [hits, conversations, query]);

  async function toggleState(c: Conversation, field: "pinned" | "archived") {
    setBusy(c.id);
    const supabase = createClient();
    await supabase.from("conversation_state").upsert(
      { user_id: currentUserId, peer_id: c.id, [field]: !c[field], updated_at: new Date().toISOString() },
      { onConflict: "user_id,peer_id" },
    );
    setBusy(null);
    router.refresh();
  }

  function preview(c: Conversation) {
    if (!c.last) return "Nenhuma mensagem ainda";
    const base = c.last.kind === "event" ? c.last.content : (c.last.sender_id === currentUserId ? "Você: " : "") + c.last.content;
    return base.replace(/@\[([^\]]+)\]\(lesson:[0-9a-fA-F-]+\)/g, "$1");
  }

  function avatar(c: Conversation) {
    const dot = online.has(c.id) ? (
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-surface" title="Online" />
    ) : null;
    if (c.avatarUrl) {
      return (
        <span className="relative shrink-0">
          <Image src={c.avatarUrl} alt={c.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
          {dot}
        </span>
      );
    }
    const initials = c.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    return (
      <span className="relative shrink-0">
        <span className="h-10 w-10 rounded-full bg-indigo-600 text-white grid place-items-center text-sm font-semibold">{initials || "?"}</span>
        {dot}
      </span>
    );
  }

  function row(c: Conversation) {
    const isUnread = c.unread > 0;
    const status = online.has(c.id) ? "online" : lastSeenLabel(c.lastSeenAt);
    return (
      <div key={c.id} className={`group relative rounded-lg transition-colors ${selected === c.id ? "bg-indigo-50 dark:bg-indigo-950" : "hover:bg-surface"}`}>
        <button onClick={() => setSelected(c.id)} className="w-full text-left p-3 flex items-center gap-3">
          {avatar(c)}
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className={`truncate flex items-center gap-1 ${isUnread ? "font-semibold" : "font-medium"}`}>
                {c.pinned && <Pin size={12} className="text-indigo-500 shrink-0" />}
                {c.name}
              </span>
              {c.last && <span className="text-[11px] text-muted shrink-0">{timeLabel(c.last.created_at)}</span>}
            </span>
            <span className={`block text-xs truncate ${isUnread ? "text-foreground font-medium" : "text-muted"}`}>
              {status ? <span className="text-[10px] text-muted">{status === "online" ? "● online" : `visto ${status}`} · </span> : null}
              {preview(c)}
            </span>
          </span>
          {isUnread && <span className="min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-indigo-600 text-white text-[11px] font-semibold shrink-0">{c.unread}</span>}
        </button>
        {/* Ações: fixar / arquivar */}
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button title={c.pinned ? "Desafixar" : "Fixar"} aria-label={c.pinned ? `Desafixar conversa com ${c.name}` : `Fixar conversa com ${c.name}`} disabled={busy === c.id}
            onClick={() => toggleState(c, "pinned")}
            className="p-1 rounded-md bg-surface border border-border hover:bg-background disabled:opacity-50">
            {c.pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
          <button title={c.archived ? "Desarquivar" : "Arquivar"} aria-label={c.archived ? `Desarquivar conversa com ${c.name}` : `Arquivar conversa com ${c.name}`} disabled={busy === c.id}
            onClick={() => toggleState(c, "archived")}
            className="p-1 rounded-md bg-surface border border-border hover:bg-background disabled:opacity-50">
            {c.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-4" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Lista (master) */}
      <div className={`${selected ? "hidden lg:flex" : "flex"} flex-col min-h-0`}>
        <h1 className="text-2xl font-semibold mb-3">Mensagens</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conversa ou mensagem…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scroll-thin">
          {visible.length === 0 && contentMatches.length === 0 && archived.length === 0 ? (
            <p className="text-muted text-sm p-3">Nenhuma conversa. Convide um aluno em <strong>Meus Alunos</strong>.</p>
          ) : (
            <>
              {visible.map(row)}

              {contentMatches.length > 0 && (
                <div className="pt-2">
                  <p className="px-3 py-1 text-[11px] font-medium text-muted uppercase tracking-wide">Mensagens encontradas</p>
                  {contentMatches.map(({ conv, snippet }) => (
                    <button key={`hit-${conv.id}`} onClick={() => setSelected(conv.id)}
                      className="w-full text-left rounded-lg p-3 flex items-center gap-3 hover:bg-surface transition-colors">
                      {avatar(conv)}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium truncate">{conv.name}</span>
                        <span className="block text-xs text-muted truncate">{snippet.replace(/@\[([^\]]+)\]\(lesson:[0-9a-fA-F-]+\)/g, "$1")}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {archived.length > 0 && (
                <div className="pt-2">
                  <button onClick={() => setShowArchived((s) => !s)}
                    className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors">
                    {showArchived ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Arquivadas ({archived.length})
                  </button>
                  {showArchived && archived.map(row)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div className={`${selected ? "flex" : "hidden lg:flex"} flex-col min-h-0`}>
        {current ? (
          <ChatConversation
            currentUserId={currentUserId}
            other={current}
            online={online.has(current.id)}
            lastSeen={lastSeenLabel(current.lastSeenAt)}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-muted">
            <div className="text-center"><MessageSquare className="mx-auto mb-2" size={28} /><p className="text-sm">Selecione uma conversa</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
