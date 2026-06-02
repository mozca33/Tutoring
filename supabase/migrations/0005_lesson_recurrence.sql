-- Agrupa aulas criadas em série (recorrência). Nulo = aula avulsa.
alter table public.lessons add column if not exists recurrence_group uuid;
create index if not exists lessons_recurrence_group_idx on public.lessons (recurrence_group);
