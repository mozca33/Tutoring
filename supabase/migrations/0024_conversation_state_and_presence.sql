-- Estado por conversa (por usuário e por par): lido, fixado, arquivado.
create table if not exists public.conversation_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  peer_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  pinned boolean not null default false,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, peer_id)
);

alter table public.conversation_state enable row level security;

-- O dono só enxerga e altera o próprio estado.
drop policy if exists conversation_state_select on public.conversation_state;
create policy conversation_state_select on public.conversation_state
  for select using (user_id = auth.uid());

drop policy if exists conversation_state_insert on public.conversation_state;
create policy conversation_state_insert on public.conversation_state
  for insert with check (user_id = auth.uid());

drop policy if exists conversation_state_update on public.conversation_state;
create policy conversation_state_update on public.conversation_state
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists conversation_state_delete on public.conversation_state;
create policy conversation_state_delete on public.conversation_state
  for delete using (user_id = auth.uid());

-- Presença: "visto por último".
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Upsert do estado de leitura (marca conversa como lida agora).
create or replace function public.mark_conversation_read(p_peer uuid)
returns void
language sql
security invoker
as $$
  insert into public.conversation_state (user_id, peer_id, last_read_at, updated_at)
  values (auth.uid(), p_peer, now(), now())
  on conflict (user_id, peer_id)
  do update set last_read_at = now(), updated_at = now();
$$;

-- Heartbeat de presença (atualiza o próprio last_seen_at).
create or replace function public.touch_last_seen()
returns void
language sql
security invoker
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;
