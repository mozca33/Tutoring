-- Eventos de aula no chat (concluída/cancelada/remarcada) + justificativa
alter table public.messages add column if not exists event_type text;     -- completed | cancelled | rescheduled
alter table public.messages add column if not exists justification text;   -- motivo (cancelada/remarcada)
