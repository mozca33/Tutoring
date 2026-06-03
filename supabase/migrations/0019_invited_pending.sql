-- Marca aluno convidado que ainda não definiu a senha (primeiro acesso pendente)
alter table public.profiles add column if not exists invited_pending boolean not null default false;
