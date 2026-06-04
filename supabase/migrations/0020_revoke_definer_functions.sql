-- Impede chamada via REST/RPC dessas funções SECURITY DEFINER (uso só interno: cron/trigger)
revoke execute on function public.delete_expired_trial_data() from anon, authenticated, public;
revoke execute on function public.expire_trials() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
