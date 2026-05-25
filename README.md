# Tutoring — Plataforma de Aulas Particulares

SaaS para professores particulares e alunos: vídeo ao vivo, chat, materiais, lição de casa, agenda e histórico.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind · Supabase (Postgres + Auth + Storage + Realtime) · LiveKit Cloud (vídeo/áudio/tela) · Vercel (deploy).

---

## ✅ O que já foi feito (MVP enxuto)

### Estrutura do projeto
- Next.js 16 + TypeScript + Tailwind + App Router + `src/` + alias `@/*`
- Dependências instaladas: `@supabase/supabase-js`, `@supabase/ssr`, `livekit-client`, `livekit-server-sdk`, `@livekit/components-react`, `@livekit/components-styles`, `date-fns`, `lucide-react`

### Banco de dados
- `supabase/migrations/0001_init.sql` — schema inicial
- `supabase/migrations/0002_extend.sql` — coluna `email` em profiles + policy de storage para arquivos de homework + Realtime habilitado em `messages`, `lesson_comments`, `lesson_files`

**Detalhe da migration 0001:**
- Tabelas: `profiles`, `relationships` (professor↔aluno), `lessons`, `messages` (chat), `lesson_files`, `homeworks`, `lesson_comments`
- Enum `user_role` (`student` | `teacher`) e `lesson_status`
- **Row Level Security** habilitado em todas as tabelas, com policies garantindo que cada usuário só enxerga seus dados
- Trigger `on_auth_user_created` cria o profile automaticamente no signup (lendo `full_name` e `role` do `raw_user_meta_data`)
- Bucket de Storage **`lesson-files`** + policies para upload/download restritos às partes da aula
- Cada aula recebe um `room_name` único usado pelo LiveKit

### Autenticação
- `src/lib/supabase/{client,server,middleware}.ts` — clientes para browser/server + helper de sessão
- `src/middleware.ts` — protege rotas `/app/*`, redireciona `/login` se autenticado
- `/signup` — cadastro com escolha de papel (Aluno / Professor)
- `/login` — login email+senha
- Botão de logout no header

### Dashboard
- `/app` — lista de **Próximas aulas** e **Histórico**
- Professor vê formulário para **agendar nova aula** (escolhe aluno vinculado, título, data/hora, duração)

### Sala de aula com vídeo (LiveKit)
- `/app/lessons/[id]` — página da aula
- `lesson-room.tsx` — botão "Entrar" → busca token via API → renderiza `<LiveKitRoom><VideoConference/></LiveKitRoom>` (vídeo, áudio, **compartilhamento de tela**, layout pronto)
- `src/app/api/livekit-token/route.ts` — emite JWT com base no usuário autenticado, validando que ele é professor ou aluno daquela aula
- Componente de **comentários da aula** já funcional (resumos, anotações pós-aula)

### Outros
- `.env.local.example` com todas as variáveis necessárias
- Type-check passa (`npx tsc --noEmit`)

---

## 🚀 Passos para colocar pra rodar

### 1. Criar projeto Supabase
1. Acesse https://supabase.com → **New project**
2. Aguarde o provisionamento (~2 min)
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Em **SQL Editor**, execute em ordem: `supabase/migrations/0001_init.sql`, depois `supabase/migrations/0002_extend.sql`
5. Em **Authentication → Providers → Email**, deixe ativo. Para o MVP, desabilite "Confirm email" temporariamente para facilitar testes.

### 2. Criar projeto LiveKit Cloud
1. Acesse https://cloud.livekit.io → crie conta (tier gratuito generoso)
2. Crie um projeto → **Settings → Keys** → gere uma API Key
3. Copie:
   - `API Key` → `LIVEKIT_API_KEY`
   - `API Secret` → `LIVEKIT_API_SECRET`
   - `WebSocket URL` (algo como `wss://xxx.livekit.cloud`) → `NEXT_PUBLIC_LIVEKIT_URL`

### 3. Rodar local
```bash
cd Documents/Codigos/tutoring
cp .env.local.example .env.local   # preencha os valores
npm run dev
```
Abra http://localhost:3000

### 4. Testar o fluxo
1. Cadastre uma conta como **Professor** (ex.: prof@test.com)
2. Cadastre outra conta (anônima ou em outro navegador) como **Aluno** (ex.: aluno@test.com)
3. Logue como professor → vá em **Contatos** → adicione o aluno pelo e-mail
4. Volte ao Dashboard → agende uma aula
5. Abra a aula em dois navegadores (um logado como professor, outro como aluno) → clique "Entrar na sala" → vídeo deve conectar
6. Teste **Mensagens**, **Materiais** (upload de arquivo) e **Lição de casa** (professor cria, aluno entrega, professor corrige)

### 5. Deploy na Vercel
1. `git init && git add . && git commit -m "init"` e suba para o GitHub
2. Em https://vercel.com/new → importe o repo
3. Adicione todas as variáveis de `.env.local` em **Environment Variables**
4. Deploy

---

## 📋 Próximos passos (roadmap)

### Curto prazo — completar features pedidas ✅
- [x] **Vinculação aluno↔professor pela UI** — `/app/contatos` (professor adiciona aluno por e-mail)
- [x] **Chat em tempo real** — `/app/chat` + `/app/chat/[userId]` com Supabase Realtime
- [x] **Upload de arquivos da aula** — botão + lista + download via signed URL + remoção
- [x] **Lição de casa** — professor cria/corrige, aluno submete texto
- [x] **Edição/cancelamento/exclusão** de aula pelo professor
- [ ] Submissão de arquivos na lição de casa (hoje só texto)
- [ ] Marcar aula como concluída + preencher `summary`

### Médio prazo — qualidade
- [ ] Confirmação de email + recuperação de senha
- [ ] Notificações por email (Supabase + Resend) — "sua aula começa em 10 min"
- [ ] **Gravação das aulas** (LiveKit Cloud Recording → S3 ou Supabase Storage)
- [ ] Realtime no dashboard: status "live" quando alguém entra na sala
- [ ] Timezone correto por usuário
- [ ] Presença e leitura no chat
- [ ] Calendário visual (mês/semana)

### Longo prazo — produto SaaS
- [ ] **Multi-aluno por aula** (aulas em grupo)
- [ ] Pagamentos (Stripe) — assinaturas ou pacote de aulas
- [ ] Página pública do professor (perfil, agenda aberta, booking)
- [ ] Avaliações e reviews
- [ ] App mobile (React Native ou PWA)
- [ ] Whiteboard colaborativo na sala (Excalidraw/tldraw)
- [ ] Transcrição + resumo automático com IA

### Decisões pendentes
- **Pagamento**: Stripe direto ou via marketplace? (Recomendado: Stripe + webhooks gravando em Supabase)
- **Gravações**: LiveKit oferece egress direto pra S3 — escolher provider
- **Convites**: link mágico ou aluno se cadastra sozinho e professor adiciona por email?

---

## 🗂 Estrutura

```
tutoring/
├── supabase/migrations/0001_init.sql   # schema + RLS + bucket
├── src/
│   ├── middleware.ts                   # auth gate
│   ├── lib/supabase/                   # client.ts, server.ts, middleware.ts
│   └── app/
│       ├── page.tsx                    # landing
│       ├── login/page.tsx
│       ├── signup/page.tsx
│       ├── api/livekit-token/route.ts  # emite JWT do LiveKit
│       └── app/                        # área autenticada
│           ├── layout.tsx              # header + auth guard
│           ├── page.tsx                # dashboard
│           ├── new-lesson-form.tsx
│           ├── sign-out-button.tsx
│           └── lessons/[id]/
│               ├── page.tsx
│               ├── lesson-room.tsx     # LiveKit
│               └── lesson-comments.tsx
└── .env.local.example
```
