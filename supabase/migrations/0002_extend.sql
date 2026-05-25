-- =====================================================
-- Extension: add email to profiles + homework file policy
-- =====================================================

alter table public.profiles add column if not exists email text;

-- Backfill from auth.users for existing rows
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create unique index if not exists profiles_email_idx on public.profiles (lower(email));

-- Updated trigger to also persist email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    new.email
  );
  return new;
end;
$$;

-- Allow reading homework submission files via storage
create policy "homework_files_read" on storage.objects for select to authenticated using (
  bucket_id = 'lesson-files' and exists (
    select 1 from public.homeworks h
    where h.submission_file_path = name and (h.teacher_id = auth.uid() or h.student_id = auth.uid())
  )
);

-- Enable Realtime on messages and lesson_comments
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.lesson_comments;
alter publication supabase_realtime add table public.lesson_files;
