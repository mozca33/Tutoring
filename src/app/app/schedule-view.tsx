"use client";

import { useMemo, useState, useEffect } from "react";
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

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_MIN = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type Popup = { date: Date; x: number; y: number };

export default function ScheduleView({
  lessons,
  students,
  isTeacher,
  locked = false,
  trialDaysLeft = null,
  subscriptionStatus = "none",
}: {
  lessons: Lesson[];
  students: { id: string; full_name: string }[];
  isTeacher: boolean;
  locked?: boolean;
  trialDaysLeft?: number | null;
  subscriptionStatus?: string;
}) {
  const router = useRouter();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [popup, setPopup] = useState<Popup | null>(null);
  const [dialogDate, setDialogDate] = useState<Date | null>(null);

  // Atualiza periodicamente para mostrar aulas novas (ex.: o professor agendou).
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(id);
  }, [router]);

  const byDay = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const k = dayKey(new Date(l.scheduled_at));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(l);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    return map;
  }, [lessons]);

  const cells = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return lessons
      .filter((l) => l.status !== "cancelled" && l.status !== "completed" && new Date(l.scheduled_at).getTime() >= now - 3600_000)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      .slice(0, 12);
  }, [lessons]);

  function goMonth(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    setPopup(null);
  }
  function goToday() {
    const t = new Date();
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    setPopup(null);
  }

  function openDay(d: Date, e: React.MouseEvent) {
    if (d.getMonth() !== cursor.getMonth()) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    const pad = 12;
    const w = 280, h = 320;
    const x = Math.min(e.clientX, window.innerWidth - w - pad);
    const y = Math.min(e.clientY, window.innerHeight - h - pad);
    setPopup({ date: d, x: Math.max(pad, x), y: Math.max(pad, y) });
  }

  const canSchedule = isTeacher && !locked;

  return (
    <div className="space-y-5">
      {isTeacher && locked && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Seu período de teste terminou. Assine para voltar a agendar aulas e enviar materiais.
          </p>
          <Link href="/app/assinatura" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-sm font-medium transition-colors">
            Ver planos
          </Link>
        </div>
      )}
      {isTeacher && !locked && trialDaysLeft !== null && subscriptionStatus === "trialing" && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 p-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            Você está no período de teste — {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}.
          </p>
          <Link href="/app/assinatura" className="text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:underline">
            Assinar agora
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold capitalize">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h1>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface transition-colors">Hoje</button>
          <button onClick={() => goMonth(-1)} aria-label="Mês anterior" className="rounded-lg border border-border p-1.5 hover:bg-surface transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={() => goMonth(1)} aria-label="Próximo mês" className="rounded-lg border border-border p-1.5 hover:bg-surface transition-colors"><ChevronRight size={18} /></button>
          {canSchedule && (
            <button onClick={() => setDialogDate(today)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-sm font-medium transition-colors">
              <Plus size={16} /> Nova aula
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
      {/* Calendário full-width */}
      <div className="flex-1 min-w-0 bg-surface border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS_SHORT.map((w) => (
            <div key={w} className="px-2 py-2.5 text-center text-xs font-medium text-muted">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const dayLessons = byDay.get(dayKey(d)) ?? [];
            return (
              <button
                key={i}
                onClick={(e) => openDay(d, e)}
                className={`min-h-[7.5rem] border-b border-r border-border p-2 text-left align-top transition-colors last:border-r-0 ${
                  inMonth ? "" : "bg-background/40 text-muted"
                } hover:bg-background`}
              >
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  isToday ? "bg-indigo-600 text-white font-semibold" : ""
                }`}>
                  {d.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayLessons.slice(0, 4).map((l) => {
                    const st = STATUS[l.status] ?? STATUS.scheduled;
                    return (
                      <div key={l.id} className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs truncate ${st.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
                        <span className="truncate">{new Date(l.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {l.title}</span>
                      </div>
                    );
                  })}
                  {dayLessons.length > 4 && <div className="text-xs text-muted pl-1">+{dayLessons.length - 4} mais</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista lateral: próximas aulas */}
      <aside className="xl:w-80 shrink-0 bg-surface border border-border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Próximas aulas</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma aula agendada.</p>
        ) : (
          <ul className="space-y-2 max-h-[32rem] overflow-y-auto">
            {upcoming.map((l) => {
              const dt = new Date(l.scheduled_at);
              const st = STATUS[l.status] ?? STATUS.scheduled;
              return (
                <li key={l.id}>
                  <Link href={`/app/lessons/${l.id}`} className="block rounded-lg border border-border p-3 hover:bg-background transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{l.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${st.chip}`}>{st.label}</span>
                    </div>
                    <span className="text-xs text-muted flex items-center gap-1 mt-1 capitalize">
                      <Clock size={12} /> {dt.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}, {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-xs text-muted truncate block">com {l.studentName}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      </div>

      {/* Popup do dia */}
      {popup && (
        <DayPopup
          popup={popup}
          lessons={byDay.get(dayKey(popup.date)) ?? []}
          isTeacher={canSchedule}
          onClose={() => setPopup(null)}
          onNew={() => { setDialogDate(popup.date); setPopup(null); }}
        />
      )}

      {dialogDate && (
        <LessonDialog
          students={students}
          initialDate={dialogDate}
          onClose={() => setDialogDate(null)}
        />
      )}
    </div>
  );
}

function DayPopup({
  popup, lessons, isTeacher, onClose, onNew,
}: {
  popup: Popup;
  lessons: Lesson[];
  isTeacher: boolean;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-72 max-w-[18rem] bg-surface border border-border rounded-xl shadow-xl"
        style={{ left: popup.x, top: popup.y }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-medium capitalize">
            {popup.date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
          </p>
          <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="max-h-56 overflow-y-auto p-2 space-y-1">
          {lessons.length === 0 ? (
            <p className="text-sm text-muted px-2 py-3">Sem aulas neste dia.</p>
          ) : (
            lessons.map((l) => {
              const dt = new Date(l.scheduled_at);
              const st = STATUS[l.status] ?? STATUS.scheduled;
              return (
                <Link key={l.id} href={`/app/lessons/${l.id}`} className="block rounded-lg p-2 hover:bg-background transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{l.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${st.chip}`}>{st.label}</span>
                  </div>
                  <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {l.duration_minutes} min
                  </span>
                </Link>
              );
            })
          )}
        </div>
        {isTeacher && (
          <div className="p-2 border-t border-border">
            <button onClick={onNew} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm font-medium transition-colors">
              <Plus size={16} /> Nova aula
            </button>
          </div>
        )}
      </div>
    </>
  );
}

type Frequency = "daily" | "3x_week" | "weekly" | "monthly" | "custom";

const FREQ_LABEL: Record<Frequency, string> = {
  daily: "Todos os dias",
  "3x_week": "3 vezes na semana",
  weekly: "1 vez na semana",
  monthly: "1 vez no mês",
  custom: "Personalizado",
};

/** Gera as datas da recorrência a partir da data base. */
function generateDates(base: Date, freq: Frequency, weekdays: number[], everyWeeks: number, count: number): Date[] {
  const out: Date[] = [];
  const cap = Math.min(Math.max(count, 1), 60);

  if (freq === "daily") {
    for (let i = 0; i < cap; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i); out.push(d);
    }
    return out;
  }
  if (freq === "weekly") {
    for (let i = 0; i < cap; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i * 7); out.push(d);
    }
    return out;
  }
  if (freq === "monthly") {
    for (let i = 0; i < cap; i++) {
      const d = new Date(base); d.setMonth(base.getMonth() + i); out.push(d);
    }
    return out;
  }
  // baseadas em dias da semana: 3x_week (Seg/Qua/Sex) ou custom
  const days = freq === "3x_week" ? [1, 3, 5] : [...weekdays].sort((a, b) => a - b);
  if (days.length === 0) return [base];
  const step = freq === "custom" ? Math.max(everyWeeks, 1) : 1;

  // começa no domingo da semana da data base
  const weekStart = new Date(base);
  weekStart.setDate(base.getDate() - base.getDay());
  let week = 0;
  while (out.length < cap && week < 520) {
    for (const wd of days) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + week * 7 * step + wd);
      d.setHours(base.getHours(), base.getMinutes(), 0, 0);
      if (d >= stripTime(base) && out.length < cap) out.push(d);
    }
    week++;
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}
function stripTime(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

function LessonDialog({
  students, initialDate, onClose,
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

  const [date, setDate] = useState(dayKey(initialDate));
  const [time, setTime] = useState("09:00");
  const [manual, setManual] = useState(`${dayKey(initialDate)}T09:00`);

  // Recorrência
  const [recurring, setRecurring] = useState(false);
  const [freq, setFreq] = useState<Frequency>("weekly");
  const [weekdays, setWeekdays] = useState<number[]>([initialDate.getDay()]);
  const [everyWeeks, setEveryWeeks] = useState(1);
  const [count, setCount] = useState(4);

  function baseDate(): Date | null {
    const str = manualMode ? manual : `${date}T${time}`;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  const dates = useMemo(() => {
    const b = baseDate();
    if (!b) return [];
    if (!recurring) return [b];
    return generateDates(b, freq, weekdays, everyWeeks, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, freq, weekdays, everyWeeks, count, date, time, manual, manualMode]);

  function toggleWeekday(wd: number) {
    setWeekdays((prev) => prev.includes(wd) ? prev.filter((x) => x !== wd) : [...prev, wd]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Informe o título da aula.");
    if (!studentId) return setError("Selecione um aluno.");
    if (dates.length === 0) return setError("Data/hora inválida.");

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const group = recurring && dates.length > 1 ? crypto.randomUUID() : null;
    const rows = dates.map((d) => ({
      teacher_id: user.id,
      student_id: studentId,
      title: title.trim(),
      scheduled_at: d.toISOString(),
      duration_minutes: duration,
      recurrence_group: group,
    }));
    const { data: created, error } = await supabase.from("lessons").insert(rows).select("id");
    setLoading(false);
    if (error) return setError(error.message);
    // Notifica o aluno por e-mail (não bloqueia o fluxo).
    if (created?.[0]?.id) {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lesson_scheduled", id: created[0].id }),
      }).catch(() => {});
    }
    onClose();
    router.refresh();
  }

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface">
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
                  <label className="text-sm font-medium">{recurring ? "Início" : "Data e hora"}</label>
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
                <label className="block text-sm font-medium mb-1">Duração</label>
                <select className={inputClass} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
                  {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>

              {/* Recorrência */}
              <div className="rounded-lg border border-border p-3 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                  <span className="text-sm font-medium">Repetir aula</span>
                </label>

                {recurring && (
                  <div className="space-y-3 pl-1">
                    <select className={inputClass} value={freq} onChange={(e) => setFreq(e.target.value as Frequency)}>
                      {(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => (
                        <option key={f} value={f}>{FREQ_LABEL[f]}</option>
                      ))}
                    </select>

                    {freq === "custom" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted">Dias da semana</p>
                        <div className="flex gap-1">
                          {WEEKDAYS_MIN.map((w, idx) => (
                            <button key={idx} type="button" onClick={() => toggleWeekday(idx)} title={WEEKDAYS[idx]}
                              className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                                weekdays.includes(idx) ? "bg-indigo-600 text-white" : "border border-border hover:bg-background"
                              }`}>
                              {w}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          A cada
                          <input type="number" min={1} max={12} value={everyWeeks} onChange={(e) => setEveryWeeks(parseInt(e.target.value) || 1)}
                            className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-foreground" />
                          semana(s)
                        </label>
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-sm">
                      Repetir
                      <input type="number" min={1} max={60} value={count} onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-foreground" />
                      vez(es)
                    </label>

                    <p className="text-xs text-muted">
                      {dates.length > 0
                        ? `Serão criadas ${dates.length} aula(s). Última: ${dates[dates.length - 1].toLocaleDateString("pt-BR")}.`
                        : "Defina os parâmetros da recorrência."}
                    </p>
                  </div>
                )}
              </div>

              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background transition-colors">Cancelar</button>
                <button disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors">
                  {loading ? "Agendando..." : recurring && dates.length > 1 ? `Agendar ${dates.length} aulas` : "Agendar"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
