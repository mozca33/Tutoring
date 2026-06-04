-- Permissão do quadro persistida e imposta no servidor
alter table public.lessons add column if not exists board_student_allowed boolean not null default false;

drop policy if exists "bs_insert" on public.board_strokes;
create policy "bs_insert" on public.board_strokes for insert to authenticated with check (
  author_id = auth.uid() and exists (
    select 1 from public.lessons l where l.id = lesson_id and (
      l.teacher_id = auth.uid() or (l.student_id = auth.uid() and l.board_student_allowed)
    )
  )
);

-- Avatares: bucket público (URL direta funciona sem policy). Remover SELECT amplo que permitia listar.
drop policy if exists "avatars_read" on storage.objects;
