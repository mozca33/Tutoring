"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon,
  Keyboard, Clock, Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Lesson = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  teacherName: string | null;
  studentName: string | null;
};

const STATUS: Record<string, { label: string; dot: string; chip: string }> = {
  scheduled: { label: "Agendada", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  live: { label: "Ao vivo", dot: "bg-green-500", chip: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  completed: { label: "Concluída", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  cancelled: { label: "Cancelada", dot: "bg-red-500", chip: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300" },
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ScheduleView({
  lessons,
  students,
  isTeacher,
}: {
  lessons: Lesson[];
  students: { id: string; full_name: string }[];
  isTeacher: boolean;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [dialogOpen, setDialogOpen] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const k = dayKey(new Date(l.scheduled_at));
      (map.get(k) ?? map.set(k, []).get(k)!).push(l);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    return map;
  }, [lessons]);

  // Monta a grade de 6 semanas (42 células), incluindo dias dos meses vizinhos.
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const start = new Date(year, month, 1);
    start.setDate(1 - start.getDay()); // volta até o domingo
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const selectedLessons = byDay.get(dayKey(selected)) ?? [];

  function goMonth(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }
  function goToday() {
    const t = new Date();
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelected(t);
  }
  function pickDay(d: Date) {
    setSelected(d);
    if (d.getMonth() !== cursor.getMonth()) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold capitalize">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface transition-colors">Hoje</button>
          <button onClick={() => goMonth(-1)} aria-label="Mês anterior" className="rounded-lg border border-border p-1.5 hover:bg-surface transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={() => goMonth(1)} aria-label="Próximo mês" className="rounded-lg border border-border p-1.5 hover:bg-surface transition-colors"><ChevronRight size={18} /></button>
          {isTeacher && (
            <button onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-sm font-medium transition-colors">
              <Plus size={16} /> Nova aula
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-xs font-medium text-muted">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selected);
              const dayLessons = byDay.get(dayKey(d)) ?? [];
              return (
                <button
                  key={i}
                  onClick={() => pickDay(d)}
                  className={`min-h-[84px] border-b border-r border-border p-1.5 text-left align-top transition-colors ${
                    inMonth ? "" : "bg-background/50 text-muted"
                  } ${isSelected ? "ring-2 ring-inset ring-indigo-500" : "hover:bg-background"}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-indigo-600 text-white font-semibold" : ""
                  }`}>
                    {d.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayLessons.slice(0, 3).map((l) => (
                      <div key={l.id} className="flex items-center gap-1 truncate text-[11px]">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS[l.status]?.dot ?? "bg-blue-500"}`} />
                        <span className="truncate">{new Date(l.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {l.title}</span>
                      </div>
                    ))}
                    {dayLessons.length > 3 && <div className="text-[11px] text-muted">+{dayLessons.length - 3} mais</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda do dia selecionado */}
        <div className="space-y-3">
          <h2 className="font-semibold capitalize">
            {selected.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          {selectedLessons.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma aula neste dia.</p>
          ) : (
            <ul className="space-y-2">
              {selectedLessons.map((l) => {
                const dt = new Date(l.scheduled_at);
                const st = STATUS[l.status] ?? STATUS.scheduled;
                return (
                  <li key={l.id} className="bg-surface border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{l.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.chip}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-muted mt-1 flex items-center gap-1">
                      <Clock size={12} /> {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {l.duration_minutes} min
                    </p>
                    <p className="text-xs text-muted truncate">com {l.teacherName} / {l.studentName}</p>
                    <Link href={`/app/lessons/${l.id}`} className="mt-2 inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                      <Video size={14} /> {l.status === "completed" ? "Ver aula" : "Entrar"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {dialogOpen && (
        <LessonDialog
          students={students}
          initialDate={selected}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

function LessonDialog({
  students,
  initialDate,
  onClose,
}: {
  students: { id: string; full_name: string }[];
  initialDate: Date;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [duration, setDuration] = useState(60);
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modo calendário: data fixa do dia escolhido + horário (time)
  const [date, setDate] = useState(dayKey(initialDate));
  const [time, setTime] = useState("09:00");
  // Modo manual: datetime-local digitado
  const [manual, setManual] = useState(`${dayKey(initialDate)}T09:00`);

  function resolveISO(): string | null {
    const str = manualMode ? manual : `${date}T${time}`;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Informe o título da aula.");
    if (!studentId) return setError("Selecione um aluno.");
    const iso = resolveISO();
    if (!iso) return setError("Data/hora inválida.");

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { error } = await supabase.from("lessons").insert({
      teacher_id: user.id,
      student_id: studentId,
      title: title.trim(),
      scheduled_at: iso,
      duration_minutes: duration,
    });
    setLoading(false);
    if (error) return setError(error.message);
    onClose();
    router.refresh();
  }

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Nova aula</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-foreground"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {students.length === 0 ? (
            <p className="text-sm text-muted">Você ainda não tem alunos vinculados. Adicione em Contatos primeiro.</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input className={inputClass} placeholder="Ex: Revisão de matemática" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Aluno</label>
                <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Data e hora</label>
                  <button type="button" onClick={() => setManualMode(!manualMode)} className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    {manualMode ? <><CalendarIcon size={13} /> Usar calendário</> : <><Keyboard size={13} /> Digitar data</>}
                  </button>
                </div>
                {manualMode ? (
                  <input type="datetime-local" className={inputClass} value={manual} onChange={(e) => setManual(e.target.value)} />
                ) : (
                  <div className="flex gap-2">
                    <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
                    <input type="time" step={300} className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Duração (min)</label>
                <select className={inputClass} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
                  {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>

              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background transition-colors">Cancelar</button>
                <button disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors">
                  {loading ? "Agendando..." : "Agendar"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
