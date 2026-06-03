alter table public.lessons add column if not exists transcript text;
alter table public.lessons add column if not exists transcript_status text; -- processing | done | failed
