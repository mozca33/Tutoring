<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ⚠️ Manutenção obrigatória (SEMPRE)

Ao atuar neste projeto e fazer **qualquer** alteração, mudança ou documentação, é **obrigatório** manter os arquivos correspondentes atualizados na mesma tarefa. SEMPRE:

- **Mudança no banco** → aplicar a migration via MCP **e** salvar o `.sql` em `supabase/migrations/` (numeração sequencial).
- **Feature/ajuste relevante** → adicionar entrada em `src/lib/changelog.ts` (mais recente no topo).
- **Nova rota/componente/lib ou mudança estrutural** → atualizar `docs/PROJECT_STRUCTURE.md`.
- **Decisão, estado ou pendência do projeto** → atualizar a memória da Claude (`project_tutoring.md`) e, quando existir, `docs/ROADMAP.md`.
- **Nova env var** → registrar na seção de variáveis abaixo (e lembrar o usuário de adicioná-la na Vercel).
- **Sempre** rodar o build/typecheck antes de commitar, e commitar com mensagem descritiva.

Nunca deixe esses arquivos defasados em relação ao código.

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
Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET`, `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`, `SUPABASE_S3_BUCKET`.
LiveKit: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL`.
Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_ANNUAL`, `STRIPE_WEBHOOK_SECRET`.
Outros: `RESEND_API_KEY`, `RESEND_FROM`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`.
Conversão Office→PDF (fundo do quadro): `CLOUDCONVERT_API_KEY` (CloudConvert, tier grátis ~25/dia).
  Sem a key, PPT/DOCX não são convertidos (PDF/imagem seguem funcionando). Os arquivos são enviados ao CloudConvert durante a conversão.
Monitoramento (Sentry, opcional — plano grátis): `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.
  Sem essas vars o Sentry fica desligado (no-op). Defina `SENTRY_DSN`+`NEXT_PUBLIC_SENTRY_DSN` (mesmo DSN) para ativar captura de erros server+client; `SENTRY_AUTH_TOKEN`+`SENTRY_ORG`+`SENTRY_PROJECT` habilitam upload de sourcemaps no build.

## Após mudar a URL de produção
Atualizar no Supabase → Auth → URL Configuration: Site URL + Redirect URLs (`https://<dominio>/**`).
