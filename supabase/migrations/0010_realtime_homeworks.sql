-- homeworks ainda não estava no realtime; lesson_files e lesson_comments já entraram na 0002.
alter publication supabase_realtime add table public.homeworks;

-- replica identity full: garante que UPDATE/DELETE tragam a linha completa (lesson_id) para os filtros.
alter table public.homeworks replica identity full;
alter table public.lesson_files replica identity full;
alter table public.lesson_comments replica identity full;
