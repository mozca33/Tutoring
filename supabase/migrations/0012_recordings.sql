-- Gravações de aula
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false)
on conflict (id) do nothing;

alter table public.lessons add column if not exists recording_path text;
alter table public.lessons add column if not exists recording_egress_id text;
alter table public.lessons add column if not exists recording_status text; -- recording | done | failed

-- Participantes da aula podem ler a gravação (signed URL).
create policy "recordings_read" on storage.objects for select to authenticated using (
  bucket_id = 'recordings' and exists (
    select 1 from public.lessons l
    where l.recording_path = name and (l.teacher_id = auth.uid() or l.student_id = auth.uid())
  )
);
