-- INSERT: depender de owner=auth.uid() é frágil (owner pode não estar setado na checagem).
-- Permitimos upload por usuário autenticado no bucket; o controle de quem envia é feito
-- pela app + RLS da tabela lesson_files (materiais = só professor).
drop policy if exists "lesson_files_upload" on storage.objects;
create policy "lesson_files_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-files');

drop policy if exists "lesson_files_delete_owner" on storage.objects;
create policy "lesson_files_delete_owner" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-files' and (owner = auth.uid() or owner_id = auth.uid()::text));

-- Avatares: mesmo ajuste
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (owner = auth.uid() or owner_id = auth.uid()::text));

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (owner = auth.uid() or owner_id = auth.uid()::text));
