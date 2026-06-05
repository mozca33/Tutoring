# Estrutura do Projeto — Tutoring

Plataforma SaaS de aulas particulares (professor ↔ aluno). **Next.js 16 (App Router) + Supabase + LiveKit + Stripe + Vercel.**

## Onde fica cada coisa

```
src/
  instrumentation.ts          Sentry server/edge (no-op sem SENTRY_DSN) + onRequestError
  instrumentation-client.ts   Sentry client (no-op sem NEXT_PUBLIC_SENTRY_DSN)
  app/
    page.tsx                 Landing pública
    login/ signup/           Autenticação (signup = só professor)
    reset-password/          Definir senha (primeiro acesso do aluno / recuperação)
    onboarding/              Escolha de papel no 1º login via Google (só professor)
    changelog/               Changelog (acesso restrito por ADMIN_EMAILS)
    auth/callback/route.ts   Troca código OAuth/recovery por sessão (intent login vs signup)
    api/
      livekit-token/         JWT da sala (valida participante + janela de horário)
      livekit-egress/        start|stop da gravação (egress → Supabase S3)
      transcribe/            Transcrição da gravação via Gemini
      stripe/                checkout | webhook (assinatura do professor)
      notify/                E-mails (Resend): aula agendada, lição atribuída/corrigida
      invite-student/        Professor cria conta do aluno + gera LINK manual
      resend-invite/         Gera novo link de acesso do aluno
    app/                     Área logada (layout com Sidebar + MessageNotifier + PreferencesProvider)
      layout.tsx             Gate de auth + onboarding; carrega perfil/preferências
      page.tsx               Dashboard = CALENDÁRIO (ScheduleView) + paywall/trial
      schedule-view.tsx      Calendário mensal, modal Nova aula, recorrência
      sidebar.tsx            Navegação + código do professor + tema/sair
      message-notifier.tsx   Toasts de mensagem e de evento de aula
      materiais/             Lista de materiais (todos ou ?aula=id) + preview/anotar
      chat/                  Mensagens 2 painéis: busca (nome+conteúdo), presença, fixar/arquivar, não lidas no servidor
      chat/[userId]/         Conversa (timeline com eventos, blocos por dia/aula, @aula); marca lido via RPC
      contatos/              "Meus Alunos": cards (avatar, stats, ações) + convite por modal
      alunos/[id]/           Hub do aluno: métricas, histórico de aulas e de lições
      perfil/                Editar perfil, avatar, tema, densidade
      assinatura/            Planos + checkout Stripe
      lessons/[id]/          Página da AULA (hub):
        page.tsx               Cabeçalho + Quadro + Chat da aula + Ações (professor)
        lesson-room.tsx        Entrada/janela da sala de vídeo (mount client-only)
        lesson-conference.tsx  Composição LiveKit sem chat embutido
        room-controls.tsx      Áudio (mutar saída, Krisp, dispositivos) + gravar
        lesson-board.tsx       Quadro colaborativo (SVG, realtime, permissões)
        board-launcher.tsx     Botão Quadro + notificação ao aluno
        lesson-files.tsx       Materiais da aula (upload = só professor)
        lesson-homework.tsx    Lição de casa (texto + anexo)
        lesson-comments.tsx    Comentários/anotações (realtime)
        lesson-actions.tsx     Editar/Remarcar/Cancelar/Concluir (gera eventos no chat)
        recording-section.tsx  Player da gravação + gerar transcrição
        lesson-chat.tsx        Drawer do chat da aula (lesson_id)
  components/                Reutilizáveis: file-preview, pdf-annotator, file-actions-menu,
                             password-input, google-button, theme-toggle
  lib/                       supabase/ (client/server/middleware), stripe, egress, email,
                             subscription, preferences, validation, uploads, auth-redirect, changelog
  middleware.ts              Refresh de sessão + proteção de /app
supabase/migrations/         0001..0024 (schema, RLS, realtime, buckets, funções, cron, conversation_state/presença)
```

## Banco (tabelas principais)
`profiles` (role, teacher_code, subscription_*, theme/density, invited_pending, last_seen_at),
`conversation_state` (user_id, peer_id, last_read_at, pinned, archived; RPCs mark_conversation_read/touch_last_seen),
`relationships`, `lessons` (status: scheduled|rescheduled|live|completed|cancelled; recording_*, transcript),
`messages` (lesson_id, kind text|event, event_type, justification),
`lesson_files`, `homeworks`, `lesson_comments`, `file_annotations`, `board_strokes`.
Buckets Storage: `lesson-files` (privado), `avatars` (público), `recordings` (privado).

## Testes
- **Vitest + Testing Library** (jsdom). Config: `vitest.config.ts` + `vitest.setup.ts`.
- Rodar: `npm test` (CI) ou `npm run test:watch`.
- Testes colocados ao lado do código: `src/**/*.test.ts(x)` (excluídos do build do Next).
- Cobrem libs puras (validation, subscription, uploads, preferences, email, auth-redirect, changelog) e componentes (PasswordInput, GoogleButton, FileActionsMenu).
- **E2E (Playwright)**: `npm run test:e2e` (roda contra `E2E_BASE_URL`, padrão produção). Specs em `e2e/`. Cobre landing, login, signup, redirect de auth e erro de credencial.

## Padrões
- **RLS** em tudo; participantes da aula leem/escrevem o que lhes cabe.
- **Realtime** (Supabase) para chat, materiais, comentários, lição, anotações e quadro (+ broadcast no quadro).
- Componentes de cliente atualizam estado local **e** confiam no realtime; evitar `router.refresh()` na página da aula (remonta a sala).
- Segredos só em variáveis `*_SECRET`/sem `NEXT_PUBLIC_`. Service role só no servidor.
