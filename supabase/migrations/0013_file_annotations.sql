create table public.file_annotations (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.lesson_files(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  page int not null default 1,
  x real not null,   -- 0..1 relativo à largura da página
  y real not null,   -- 0..1 relativo à altura da página
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.file_annotations (file_id);
alter table public.file_annotations enable row level security;

create policy "fa_read" on public.file_annotations for select to authenticated using (
  exists (select 1 from public.lesson_files lf join public.lessons l on l.id = lf.lesson_id
    where lf.id = file_id and (l.teacher_id = auth.uid() or l.student_id = auth.uid())));
create policy "fa_insert" on public.file_annotations for insert to authenticated with check (
  author_id = auth.uid() and exists (select 1 from public.lesson_files lf join public.lessons l on l.id = lf.lesson_id
    where lf.id = file_id and (l.teacher_id = auth.uid() or l.student_id = auth.uid())));
create policy "fa_delete" on public.file_annotations for delete to authenticated using (author_id = auth.uid());

alter table public.file_annotations replica identity full;
alter publication supabase_realtime add table public.file_annotations;
