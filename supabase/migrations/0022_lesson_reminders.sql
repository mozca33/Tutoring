alter table public.lessons add column if not exists reminded boolean not null default false;

create or replace function public.send_lesson_reminders()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.messages (sender_id, recipient_id, content, lesson_id, kind, event_type)
  select l.teacher_id, l.student_id,
    'Lembrete: a aula "' || l.title || '" começa às ' ||
      to_char(l.scheduled_at at time zone 'America/Sao_Paulo', 'HH24:MI') || '.',
    l.id, 'event', 'reminder'
  from public.lessons l
  where l.status in ('scheduled', 'rescheduled')
    and l.reminded = false
    and l.scheduled_at between now() and now() + interval '30 minutes';

  update public.lessons set reminded = true
  where status in ('scheduled', 'rescheduled') and reminded = false
    and scheduled_at between now() and now() + interval '30 minutes';
end;
$$;

revoke execute on function public.send_lesson_reminders() from anon, authenticated, public;

do $$ begin perform cron.unschedule('lesson-reminders'); exception when others then null; end $$;
select cron.schedule('lesson-reminders', '*/15 * * * *', $$ select public.send_lesson_reminders(); $$);
