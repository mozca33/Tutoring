-- Marca se o usuário já confirmou seu papel (aluno/professor).
-- Cadastro por e-mail confirma na hora; login via Google entra sem escolher → precisa onboarding.
alter table public.profiles add column if not exists role_confirmed boolean not null default true;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, email, role_confirmed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    new.email,
    (new.raw_user_meta_data ? 'role')  -- true se veio do cadastro por e-mail; false no OAuth
  );
  return new;
end;
$$;
