"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarClock, CalendarX, CheckCircle2, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  kind?: string | null;
  lesson_id?: string | null;
  event_type?: string | null;
  justification?: string | null;
};

type LessonRef = { id: string; title: string; scheduled_at: string };

const MENTION_RE = /@\[([^\]]+)\]\(lesson:([0-9a-fA-F-]+)\)/g;

function hhmm(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function renderContent(content: string, mine: boolean) {
  const parts: React.ReactNode[] = [];
  let last = 0; let m: RegExpExecArray | null; let key = 0;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(content))) {
    if (m.index > last) parts.push(content.slice(last, m.index));
    parts.push(
      <Link key={key++} href={`/app/lessons/${m[2]}`}
        className={`inline-flex items-center gap-0.5 font-medium rounded px-1 ${mine ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"}`}>
        <BookOpen size={12} /> {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return parts;
}

function EventCard({ m }: { m: Message }) {
  const icon = m.event_type === "completed" ? <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
    : m.event_type === "cancelled" ? <CalendarX size={15} className="text-amber-600 dark:text-amber-400" />
    : <CalendarClock size={15} className="text-violet-600 dark:text-violet-400" />;
  // Concluída → Materiais da aula; demais → a própria aula.
  const href = m.event_type === "completed" ? `/app/materiais?aula=${m.lesson_id}` : `/app/lessons/${m.lesson_id}`;
  return (
    <div className="my-2">
      <Link href={href}
        className="flex items-start gap-2 border border-border rounded-lg px-3 py-2 bg-surface hover:bg-background transition-colors">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span className="text-sm font-medium">{m.content}</span>
      </Link>
      {m.justification && (
        <p className="text-xs text-muted mt-1 pl-1"><span className="font-medium">Justificativa:</span> {m.justification}</p>
      )}
      <p className="text-[10px] text-muted pl-1 mt-0.5">{hhmm(m.created_at)}</p>
    </div>
  );
}

export default function ChatWindow({
  currentUserId, otherUserId, initial,
}: {
  currentUserId: string;
  otherUserId: string;
  initial: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length >= 50);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lessons, setLessons] = useState<LessonRef[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const prependRef = useRef<number | null>(null);

  function toggle(key: string) { setCollapsed((p) => ({ ...p, [key]: !p[key] })); }
  const lessonTitle = (id?: string | null) => lessons.find((l) => l.id === id)?.title ?? "Aula";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prependRef.current !== null) {
      // Mantém a posição de leitura ao carregar mensagens anteriores.
      el.scrollTop = el.scrollHeight - prependRef.current;
      prependRef.current = null;
    } else {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [messages]);

  async function loadOlder() {
    if (loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const supabase = createClient();
    const oldest = messages[0].created_at;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, created_at, kind, lesson_id, event_type, justification")
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
      .lt("created_at", oldest)
      .order("created_at", { ascending: false })
      .limit(50);
    const older = (data ?? []).reverse();
    setHasMore(older.length >= 50);
    if (older.length) {
      prependRef.current = scrollRef.current?.scrollHeight ?? 0;
      setMessages((prev) => [...older, ...prev]);
    }
    setLoadingOlder(false);
  }

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("lessons").select("id, title, scheduled_at")
        .or(`and(teacher_id.eq.${currentUserId},student_id.eq.${otherUserId}),and(teacher_id.eq.${otherUserId},student_id.eq.${currentUserId})`)
        .order("scheduled_at", { ascending: false }).returns<LessonRef[]>();
      setLessons(data ?? []);
    })();
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${[currentUserId, otherUserId].sort().join(":")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const inConvo =
            (m.sender_id === currentUserId && m.recipient_id === otherUserId) ||
            (m.sender_id === otherUserId && m.recipient_id === currentUserId);
          if (!inConvo) return;
          setMessages((prev) => prev.some((p) => p.id === m.id) ? prev : [...prev, m]);
          if (m.sender_id === otherUserId) supabase.rpc("mark_conversation_read", { p_peer: otherUserId });
        })
      .subscribe();
    // Marca como lida ao abrir a conversa.
    supabase.rpc("mark_conversation_read", { p_peer: otherUserId });
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, otherUserId]);

  function onChange(value: string) {
    setText(value);
    const match = value.match(/@([^@]*)$/);
    setMentionQuery(match ? match[1].toLowerCase() : null);
  }
  function pickLesson(l: LessonRef) {
    setText((prev) => prev.replace(/@([^@]*)$/, `@[${l.title}](lesson:${l.id}) `));
    setMentionQuery(null);
  }
  const suggestions = mentionQuery !== null
    ? lessons.filter((l) => l.title.toLowerCase().includes(mentionQuery)).slice(0, 6) : [];

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: currentUserId, recipient_id: otherUserId, content: text.trim() })
      .select("id, sender_id, recipient_id, content, created_at, kind, lesson_id, event_type, justification")
      .single();
    setSending(false);
    if (error || !data) return;
    setMessages((prev) => prev.some((p) => p.id === data.id) ? prev : [...prev, data]);
    setText("");
  }

  function renderItem(m: Message) {
    if (m.kind === "event") return <EventCard key={m.id} m={m} />;
    const mine = m.sender_id === currentUserId;
    return (
      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-md px-3 py-2 rounded-2xl ${mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"}`}>
          <p className="whitespace-pre-wrap break-words">{renderContent(m.content, mine)}</p>
          <p className={`text-[10px] mt-1 ${mine ? "text-indigo-100" : "text-slate-500"}`}>{hhmm(m.created_at)}</p>
        </div>
      </div>
    );
  }

  // Agrupa em blocos: por DIA (mensagens normais + eventos) e por AULA (chat da aula ao vivo)
  type Block = { key: string; kind: "day" | "lesson"; label: string; items: Message[] };
  const blocks: Block[] = [];
  const idx: Record<string, number> = {};
  for (const m of messages) {
    const isLessonChat = m.kind !== "event" && !!m.lesson_id;
    const key = isLessonChat ? `lesson:${m.lesson_id}` : `day:${dayLabel(m.created_at)}`;
    if (idx[key] === undefined) {
      idx[key] = blocks.length;
      blocks.push({ key, kind: isLessonChat ? "lesson" : "day", label: isLessonChat ? lessonTitle(m.lesson_id) : dayLabel(m.created_at), items: [] });
    }
    blocks[idx[key]].items.push(m);
  }
  // Aula recolhida por padrão; dia expandido.
  const isCollapsed = (b: Block) => (b.key in collapsed ? collapsed[b.key] : b.kind === "lesson");

  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 scroll-thin">
        {hasMore && (
          <div className="text-center">
            <button onClick={loadOlder} disabled={loadingOlder}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50">
              {loadingOlder ? "Carregando…" : "Carregar mensagens anteriores"}
            </button>
          </div>
        )}
        {messages.length === 0 && <p className="text-muted text-center mt-8">Nenhuma mensagem. Diga olá!</p>}
        {blocks.map((b) => {
          const col = isCollapsed(b);
          if (b.kind === "lesson") {
            return (
              <div key={b.key} className="border border-border rounded-lg my-2 overflow-hidden">
                <button onClick={() => toggle(b.key)} className="w-full flex items-center gap-1.5 px-3 py-2 text-sm bg-background hover:bg-surface transition-colors">
                  {col ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="font-medium truncate">Chat da aula: {b.label}</span>
                  <span className="text-xs text-muted ml-auto">{b.items.length}</span>
                </button>
                {!col && <div className="p-3 space-y-2">{b.items.map(renderItem)}</div>}
              </div>
            );
          }
          return (
            <div key={b.key} className="my-1">
              <button onClick={() => toggle(b.key)} className="mx-auto flex items-center gap-1 text-xs text-muted my-2 hover:text-foreground transition-colors">
                {col ? <ChevronRight size={13} /> : <ChevronDown size={13} />} {b.label}
              </button>
              {!col && <div className="space-y-2">{b.items.map(renderItem)}</div>}
            </div>
          );
        })}
      </div>

      <div className="relative">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 w-72 max-h-56 overflow-y-auto bg-surface border border-border rounded-lg shadow-xl z-10">
            <p className="px-3 py-1.5 text-xs text-muted border-b border-border">Mencionar aula</p>
            {suggestions.map((l) => (
              <button key={l.id} type="button" onClick={() => pickLesson(l)}
                className="w-full text-left px-3 py-2 hover:bg-background transition-colors flex items-center gap-2">
                <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="min-w-0"><span className="block text-sm truncate">{l.title}</span>
                  <span className="block text-xs text-muted">{new Date(l.scheduled_at).toLocaleDateString("pt-BR")}</span></span>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
          <input className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Mensagem… use @ para mencionar uma aula"
            value={text} onChange={(e) => onChange(e.target.value)} />
          <button disabled={sending} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">Enviar</button>
        </form>
      </div>
    </div>
  );
}
