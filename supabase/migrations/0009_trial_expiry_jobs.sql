create extension if not exists pg_cron;

-- Marca trials vencidos como 'expired' (NÃO apaga nada). Bloqueio de acesso já é automático.
create or replace function public.expire_trials()
returns void language sql security definer set search_path = public as $$
  update public.profiles
  set subscription_status = 'expired'
  where role = 'teacher'
    and subscription_status = 'trialing'
    and trial_ends_at is not null
    and trial_ends_at < now();
$$;

-- Função MANUAL (não agendada): apaga aulas/materiais de professores com trial expirado.
-- Cascata remove lesson_files, homeworks e lesson_comments. Use só quando decidir limpar.
create or replace function public.delete_expired_trial_data()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with del as (
    delete from public.lessons l
    using public.profiles p
    where l.teacher_id = p.id
      and p.role = 'teacher'
      and p.subscription_status = 'expired'
    returning l.id
  )
  select count(*) into n from del;
  return n;
end;
$$;

-- Agenda apenas a expiração (segura, não-destrutiva), diariamente às 03:00 UTC.
do $$ begin perform cron.unschedule('expire-trials'); exception when others then null; end $$;
select cron.schedule('expire-trials', '0 3 * * *', $$ select public.expire_trials(); $$);
