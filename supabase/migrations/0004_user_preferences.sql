-- =====================================================
-- Preferências de UI no perfil + bucket de avatares
-- (avatar_url já existe desde 0001)
-- =====================================================

alter table public.profiles add column if not exists theme text not null default 'system'
  check (theme in ('light', 'dark', 'system'));
alter table public.profiles add column if not exists density text not null default 'medium'
  check (density in ('small', 'medium', 'large'));

-- Bucket público para fotos de perfil
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_read" on storage.objects for select to public
  using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and owner = auth.uid());
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
