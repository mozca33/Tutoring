<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Infraestrutura gerenciada

Este projeto usa três serviços. O assistente gerencia os três:

- **Supabase** (Postgres + Auth + Storage): projeto `Tutoring`, id `eddzzyhpiozpfbplmixl` (region us-east-2).
  Gerenciado via MCP do Supabase (`apply_migration`, `execute_sql`, `list_tables` etc.).
  Migrations vivem em `supabase/migrations/`. Ao criar uma migration: aplicar via MCP **e** salvar o `.sql` no repo.
- **Vercel** (deploy): time `team_sq2NyrDKINo09GaQsbQeSwGG`, projeto `tutoring` (`prj_9RApcG54ICL5dW2Wt9ZW35neq4XK`).
  Ligado ao GitHub `mozca33/Tutoring` — push em `master` dispara deploy de produção automático.
  Gerenciado via MCP da Vercel (deploy, logs, deployments). **Env vars não** são editáveis por MCP — fazer no dashboard.
- **LiveKit** (vídeo): projeto `tutoring-5qr2r5bc`. **Sem MCP** — gerenciar via dashboard e `.env.local`.

## Variáveis de ambiente (necessárias em `.env.local` e na Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL`.

## Após mudar a URL de produção
Atualizar no Supabase → Auth → URL Configuration: Site URL + Redirect URLs (`https://<dominio>/**`).
