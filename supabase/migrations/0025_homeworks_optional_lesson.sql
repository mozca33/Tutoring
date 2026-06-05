-- Tarefas avulsas (aba "Tarefas"): podem existir sem estar atreladas a uma aula.
alter table public.homeworks alter column lesson_id drop not null;
