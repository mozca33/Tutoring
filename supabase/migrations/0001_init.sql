-- =====================================================
-- Tutoring Platform - Initial Schema
-- =====================================================

create type user_role as enum ('student', 'teacher');
create type lesson_status as enum ('scheduled', 'live', 'completed', 'cancelled');

-- Profiles (one row per auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- Teacher <-> Student relationship
create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id)
);

-- Scheduled lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  status lesson_status not null default 'scheduled',
  room_name text not null unique default ('lesson_' || replace(gen_random_uuid()::text, '-', '')),
  summary text,
  created_at timestamptz not null default now()
);
create index on public.lessons (teacher_id, scheduled_at desc);
create index on public.lessons (student_id, scheduled_at desc);

-- Chat messages (per relationship)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.messages (sender_id, recipient_id, created_at);

-- Lesson files (uploaded materials)
create table public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  size_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now()
);
create index on public.lesson_files (lesson_id);

-- Homework
create table public.homeworks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  instructions text,
  due_at timestamptz,
  submitted_at timestamptz,
  submission_text text,
  submission_file_path text,
  grade text,
  feedback text,
  created_at timestamptz not null default now()
);
create index on public.homeworks (student_id, due_at);

-- Lesson comments (post-class notes / summaries)
create table public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.lesson_comments (lesson_id, created_at);

-- =====================================================
-- Auto-create profile on signup
-- =====================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- Row Level Security
-- =====================================================
alter table public.profiles        enable row level security;
alter table public.relationships   enable row level security;
alter table public.lessons         enable row level security;
alter table public.messages        enable row level security;
alter table public.lesson_files    enable row level security;
alter table public.homeworks       enable row level security;
alter table public.lesson_comments enable row level security;

-- Profiles: anyone authenticated can read; you can update your own
create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid());

-- Relationships: visible to either party; teacher creates
create policy "rel_read" on public.relationships for select to authenticated
  using (teacher_id = auth.uid() or student_id = auth.uid());
create policy "rel_insert_teacher" on public.relationships for insert to authenticated
  with check (teacher_id = auth.uid());
create policy "rel_delete_teacher" on public.relationships for delete to authenticated
  using (teacher_id = auth.uid());

-- Lessons: both parties read; teacher writes
create policy "lessons_read" on public.lessons for select to authenticated
  using (teacher_id = auth.uid() or student_id = auth.uid());
create policy "lessons_insert_teacher" on public.lessons for insert to authenticated
  with check (teacher_id = auth.uid());
create policy "lessons_update_teacher" on public.lessons for update to authenticated
  using (teacher_id = auth.uid());
create policy "lessons_delete_teacher" on public.lessons for delete to authenticated
  using (teacher_id = auth.uid());

-- Messages: visible only to sender/recipient
create policy "msg_read" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "msg_insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid());

-- Lesson files: both parties of the lesson
create policy "files_read" on public.lesson_files for select to authenticated using (
  exists (select 1 from public.lessons l where l.id = lesson_id and (l.teacher_id = auth.uid() or l.student_id = auth.uid()))
);
create policy "files_insert" on public.lesson_files for insert to authenticated with check (
  uploader_id = auth.uid() and exists (
    select 1 from public.lessons l where l.id = lesson_id and (l.teacher_id = auth.uid() or l.student_id = auth.uid())
  )
);
create policy "files_delete_uploader" on public.lesson_files for delete to authenticated using (uploader_id = auth.uid());

-- Homeworks: both parties read; teacher creates/grades; student updates submission fields
create policy "hw_read" on public.homeworks for select to authenticated
  using (teacher_id = auth.uid() or student_id = auth.uid());
create policy "hw_insert_teacher" on public.homeworks for insert to authenticated with check (teacher_id = auth.uid());
create policy "hw_update_party" on public.homeworks for update to authenticated
  using (teacher_id = auth.uid() or student_id = auth.uid());

-- Lesson comments: both parties read; either can write
create policy "lc_read" on public.lesson_comments for select to authenticated using (
  exists (select 1 from public.lessons l where l.id = lesson_id and (l.teacher_id = auth.uid() or l.student_id = auth.uid()))
);
create policy "lc_insert" on public.lesson_comments for insert to authenticated with check (
  author_id = auth.uid() and exists (
    select 1 from public.lessons l where l.id = lesson_id and (l.teacher_id = auth.uid() or l.student_id = auth.uid())
  )
);

-- =====================================================
-- Storage bucket for lesson materials
-- =====================================================
insert into storage.buckets (id, name, public) values ('lesson-files', 'lesson-files', false)
on conflict (id) do nothing;

create policy "lesson_files_read" on storage.objects for select to authenticated using (
  bucket_id = 'lesson-files' and exists (
    select 1 from public.lesson_files lf
    join public.lessons l on l.id = lf.lesson_id
    where lf.storage_path = name and (l.teacher_id = auth.uid() or l.student_id = auth.uid())
  )
);
create policy "lesson_files_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-files' and owner = auth.uid());
create policy "lesson_files_delete_owner" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-files' and owner = auth.uid());
