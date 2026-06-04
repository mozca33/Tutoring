// Configuração visual e rótulos dos status de aula (fonte única).
export type LessonStatus = "scheduled" | "rescheduled" | "live" | "completed" | "cancelled";

export const LESSON_STATUS: Record<string, { label: string; dot: string; chip: string }> = {
  scheduled: { label: "Agendada", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  rescheduled: { label: "Remarcada", dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  live: { label: "Ao vivo", dot: "bg-green-500", chip: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  completed: { label: "Concluída", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  cancelled: { label: "Cancelada", dot: "bg-red-500", chip: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300" },
};

export function statusInfo(status: string) {
  return LESSON_STATUS[status] ?? LESSON_STATUS.scheduled;
}
