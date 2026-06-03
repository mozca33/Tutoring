"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarClock, CalendarX, CheckCircle2 } from "lucide-react";
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
  return (
    <div className="my-2">
      <Link href={`/app/lessons/${m.lesson_id}`}
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
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lessons, setLessons] = useState<LessonRef[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

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
        })
      .subscribe();
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

  // Monta a timeline com separadores de data
  const rows: React.ReactNode[] = [];
  let lastDay = "";
  for (const m of messages) {
    const day = dayLabel(m.created_at);
    if (day !== lastDay) {
      rows.push(<p key={`d-${m.id}`} className="text-center text-xs text-muted my-3">{day}</p>);
      lastDay = day;
    }
    if (m.kind === "event") {
      rows.push(<EventCard key={m.id} m={m} />);
    } else {
      const mine = m.sender_id === currentUserId;
      rows.push(
        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-md px-3 py-2 rounded-2xl ${mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"}`}>
            <p className="whitespace-pre-wrap break-words">{renderContent(m.content, mine)}</p>
            <p className={`text-[10px] mt-1 ${mine ? "text-indigo-100" : "text-slate-500"}`}>{hhmm(m.created_at)}</p>
          </div>
        </div>,
      );
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col" style={{ height: "65vh" }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && <p className="text-muted text-center mt-8">Nenhuma mensagem. Diga olá!</p>}
        {rows}
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
