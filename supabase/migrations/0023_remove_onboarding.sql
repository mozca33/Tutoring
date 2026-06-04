-- Sem onboarding: OAuth (sem role no metadata) já vira professor confirmado com trial.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'teacher');
begin
  insert into public.profiles (id, full_name, role, email, role_confirmed, subscription_status, trial_ends_at, teacher_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    v_role,
    new.email,
    true,
    case when v_role = 'teacher' then 'trialing' else 'none' end,
    case when v_role = 'teacher' then now() + interval '3 days' else null end,
    case when v_role = 'teacher' then upper(substr(md5(gen_random_uuid()::text), 1, 6)) else null end
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

update public.profiles
set role = 'teacher', role_confirmed = true,
    subscription_status = case when subscription_status = 'none' then 'trialing' else subscription_status end,
    trial_ends_at = coalesce(trial_ends_at, now() + interval '3 days'),
    teacher_code = coalesce(teacher_code, upper(substr(md5(gen_random_uuid()::text), 1, 6)))
where role_confirmed = false;
