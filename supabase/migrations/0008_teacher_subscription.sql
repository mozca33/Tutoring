-- Assinatura do professor (SaaS). Aluno é sempre grátis.
-- Fluxo: professor entra em trial de 3 dias; depois precisa assinar.
alter table public.profiles add column if not exists subscription_status text not null default 'none'
  check (subscription_status in ('none','trialing','active','past_due','canceled','expired'));
alter table public.profiles add column if not exists trial_ends_at timestamptz;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'student');
  v_confirmed boolean := (new.raw_user_meta_data ? 'role');
begin
  insert into public.profiles (id, full_name, role, email, role_confirmed, subscription_status, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    v_role,
    new.email,
    v_confirmed,
    case when v_role = 'teacher' and v_confirmed then 'trialing' else 'none' end,
    case when v_role = 'teacher' and v_confirmed then now() + interval '3 days' else null end
  );
  return new;
end;
$$;

update public.profiles
set subscription_status = 'trialing', trial_ends_at = now() + interval '3 days'
where role = 'teacher' and subscription_status = 'none';
