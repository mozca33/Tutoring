-- Código do professor (aluno usa para se vincular)
alter table public.profiles add column if not exists teacher_code text unique;

update public.profiles set teacher_code = upper(substr(md5(gen_random_uuid()::text), 1, 6))
where role = 'teacher' and teacher_code is null;

-- Mensagens podem pertencer a uma aula (chat ao vivo) e ter um tipo (texto/evento)
alter table public.messages add column if not exists lesson_id uuid references public.lessons(id) on delete set null;
alter table public.messages add column if not exists kind text not null default 'text';
create index if not exists messages_lesson_idx on public.messages (lesson_id, created_at);

-- Trigger: gera teacher_code ao criar professor
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'student');
  v_confirmed boolean := (new.raw_user_meta_data ? 'role');
begin
  insert into public.profiles (id, full_name, role, email, role_confirmed, subscription_status, trial_ends_at, teacher_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    v_role,
    new.email,
    v_confirmed,
    case when v_role = 'teacher' and v_confirmed then 'trialing' else 'none' end,
    case when v_role = 'teacher' and v_confirmed then now() + interval '3 days' else null end,
    case when v_role = 'teacher' then upper(substr(md5(gen_random_uuid()::text), 1, 6)) else null end
  );
  return new;
end;
$$;
