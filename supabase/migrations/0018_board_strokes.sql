-- Quadro colaborativo da aula (traços salvos = persistência após a aula)
create table public.board_strokes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  tool text not null,
  color text not null default '#ef4444',
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index on public.board_strokes (lesson_id, created_at);
alter table public.board_strokes enable row level security;

create policy "bs_read" on public.board_strokes for select to authenticated using (
  exists (select 1 from public.lessons l where l.id = lesson_id and (l.teacher_id = auth.uid() or l.student_id = auth.uid())));
create policy "bs_insert" on public.board_strokes for insert to authenticated with check (
  author_id = auth.uid() and exists (select 1 from public.lessons l where l.id = lesson_id and (l.teacher_id = auth.uid() or l.student_id = auth.uid())));
create policy "bs_delete" on public.board_strokes for delete to authenticated using (
  author_id = auth.uid() or exists (select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = auth.uid()));

alter table public.board_strokes replica identity full;
alter publication supabase_realtime add table public.board_strokes;
