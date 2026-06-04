# Roadmap — Tutoring

Estado do que falta, organizado por **o que depende de quê**. Marque itens conforme forem concluídos e registre no `src/lib/changelog.ts`.

## ✅ Concluído (rodada de melhorias)
- A1 quadro (borracha/espessura/cores), A2 notificações.
- Segurança: RLS do quadro (board_student_allowed), funções definer protegidas, avatares sem listagem, rate limit.
- Confiabilidade: webhook do LiveKit (gravação), toast de reconexão.
- Produto: portal Stripe, plano anual, lembrete de aula (cron).
- Performance: N+1 das notificações, avatares com next/image.
- Qualidade: status das aulas centralizado (`src/lib/lesson.ts`), testes unitários (Vitest, 60) + E2E (Playwright).

## ⏳ Pendente (precisa de você / serviço externo)
- **Leaked password protection** (Supabase → Auth, 1 clique).
- **Webhook do LiveKit**: cadastrar a URL `…/api/livekit-webhook` em LiveKit Cloud → Webhooks.
- **Sentry** (monitoramento): criar conta + DSN; depois instalo `@sentry/nextjs`.
- **Stripe Customer Portal**: ativar no dashboard (Settings → Billing) se necessário.
- **Resend domínio**, **Stripe live**, **env vars na Vercel** (incl. `STRIPE_PRICE_ID_ANNUAL`, `ADMIN_EMAILS`).
- PPT/DOCX no quadro, transcrição de aulas longas, busca, paginação, i18n/a11y.

## A) Buildável agora (sem credenciais)

### A1. Polimento do quadro colaborativo ✅ (feito)
- ~~Borracha (apagar traços por clique).~~
- ~~Seletor de espessura do traço (P/M/G).~~
- ~~Paleta de cores ampliada.~~
- Falta (opcional): cor personalizada (color picker livre).

### A2. Centro de notificações persistente ✅ (feito)
- Sino na sidebar/topbar com contador e lista (mensagens + eventos de aula). Não-lidas via `localStorage` (`notif_seen`).
- Falta (opcional): persistir "lido" no servidor (multi-dispositivo) com coluna `read_at`.

### A3. Granularidade do changelog
- Quebrar entradas por versão/semver e datar com mais precisão.
- **Como:** editar `src/lib/changelog.ts`.

## B) Depende de ação do usuário (dashboard/credenciais)

### B1. E-mails automáticos (Resend)
- Hoje o convite gera **link manual** (sem e-mail). Para enviar automático: verificar **domínio no Resend** (Domains → Add Domain → DNS).
- **Depois:** trocar `RESEND_FROM` para o domínio e, em `/api/invite-student`, voltar a enviar o link por e-mail (a infra já existe).

### B2. Stripe em produção (cobrança real)
- Ativar conta Stripe + conta bancária; pegar chaves `sk_live_`/`pk_live_`.
- Recriar Produto/Preço e Webhook no modo Live (dá para fazer via API com a `sk_live_`).
- Atualizar env vars `STRIPE_*` na Vercel.

### B3. Env vars na Vercel
- Garantir todas em produção, incluindo `ADMIN_EMAILS` (acesso ao `/changelog`).

### B4. Supabase Auth URLs
- Site URL + Redirect URLs com o domínio de produção (já feito; refazer se trocar domínio).

## C) Depende de serviço externo

### C1. PPT/DOCX como fundo do quadro
- Exige conversão para PDF/imagem (LibreOffice headless não roda na Vercel).
- **Opções:** API de conversão (CloudConvert/ConvertAPI — precisa chave) ou worker próprio. Por ora: orientar exportar para PDF.

### C2. Transcrição de aulas longas
- Whisper/Gemini têm limites de tamanho/tempo na função serverless. Para aulas longas: extrair áudio + chunking ou um worker dedicado.

## D) Ideias futuras (a validar)
- Página pública do professor para o aluno solicitar aula (hoje só o professor agenda).
- Relatórios/métricas do aluno por aula.
- App/notificações push.

---

**Sempre** que concluir um item: atualize este arquivo, o `src/lib/changelog.ts`, `docs/PROJECT_STRUCTURE.md` (se mudar estrutura) e a memória da Claude. (Ver `AGENTS.md` → "Manutenção obrigatória".)
