-- Apenas o professor da aula pode enviar materiais (lesson_files)
drop policy if exists "files_insert" on public.lesson_files;
create policy "files_insert" on public.lesson_files for insert to authenticated with check (
  uploader_id = auth.uid() and exists (
    select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = auth.uid()
  )
);
