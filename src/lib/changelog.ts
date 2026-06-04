// Changelog da plataforma. Mantenha o mais recente no topo.
export type ChangelogEntry = { date: string; title: string; items: string[] };

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-06-03",
    title: "Quadro colaborativo, mensagens e cadastro por convite",
    items: [
      "Cadastro simplificado: sem tela de onboarding — login com Google já entra como professor (3 dias de teste).",
      "Aba 'Meus Alunos': convite por modal e clique no nome do aluno abre o chat com ele.",
      "Correção: crash da área logada por canais de notificação duplicados.",
      "Segurança: permissão do quadro imposta no servidor (RLS), funções internas protegidas, rate limit em rotas sensíveis.",
      "Confiabilidade: webhook do LiveKit marca a gravação como concluída/falha; aviso de reconexão na sala.",
      "Assinatura: plano anual, portal do Stripe (gerenciar/cancelar) e lembrete de aula automático.",
      "Performance: notificações sem consultas repetidas (N+1); avatares otimizados.",
      "Testes: unitários (Vitest, 60) e E2E (Playwright) das telas públicas e de auth.",
      "Centro de notificações: sino na barra lateral com contador de não lidas e lista (mensagens e eventos de aula).",
      "Quadro: borracha, seletor de espessura (P/M/G) e paleta ampliada de cores.",
      "Cadastro do aluno: link de acesso robusto (a página valida o link antes de definir a senha).",
      "Quadro colaborativo ao vivo (estilo Google Slides): caneta, seta, círculo e texto, sincronizados ponto a ponto, com persistência por aula.",
      "Fundo do quadro: branco, imagem ou página de PDF — escolhe qualquer material já enviado (de qualquer aula).",
      "Permissões do quadro: professor abre → aluno recebe popup; aluno em só-leitura até o professor liberar; só o professor limpa.",
      "Aba Mensagens reformulada: timeline com separadores de data, blocos por aula e por dia (expandir/recolher).",
      "Eventos de aula no chat (aula dada / cancelada / remarcada) com link e justificativa.",
      "Novo status de aula: Remarcada (além de Agendada, Cancelada, Concluída).",
      "Chat da aula ao vivo persistente (mesmas mensagens da aba Mensagens) com botão na aula.",
      "Menção @aula no chat (autocomplete + link).",
      "Cadastro do aluno por convite do professor: cria a conta e gera um link manual para o aluno definir a senha (nome opcional → usa o e-mail).",
      "Notificações in-app: mensagens recebidas e mudanças de status de aula.",
      "Código do professor visível e copiável na barra lateral.",
      "Materiais por aula (/app/materiais?aula=...) com métricas, e ações de arquivo em menu compacto.",
      "Correções: upload não derruba mais o professor da sala; login com Google não recria conta automaticamente; placeholders e contraste; React #418.",
    ],
  },
  {
    date: "2026-06-03",
    title: "Assinatura, gravação e transcrição",
    items: [
      "Assinatura do professor (Stripe) com 3 dias de teste; paywall e bloqueio ao expirar.",
      "Gravação de aulas (LiveKit egress → Supabase Storage): aluno assiste e baixa.",
      "Transcrição da gravação via Gemini.",
      "Controles de áudio na sala: mutar saída, supressor de ruído (Krisp) e seleção de dispositivos.",
      "Atualização em tempo real de materiais, comentários/anotações e lição de casa.",
      "Preview de documentos (PDF, áudio, vídeo, imagem, CSV, DOCX/XLS) e anotações ancoradas em PDF.",
    ],
  },
  {
    date: "2026-06-02",
    title: "Calendário, deploy e identidade visual",
    items: [
      "Agenda virou calendário mensal estilo Teams, com recorrência de aulas.",
      "Onboarding de papel no primeiro login via Google.",
      "Dark mode por classe + densidade do layout (compacto/padrão/confortável).",
      "Perfil com foto, preferências e validação de senha forte.",
      "Deploy em produção (Vercel) com domínio tutoringlive.vercel.app.",
    ],
  },
  {
    date: "2026-06-02",
    title: "MVP da plataforma",
    items: [
      "Aulas particulares: agendamento, sala de vídeo (LiveKit), chat, materiais, lição de casa e comentários.",
      "Autenticação (e-mail e Google) com Supabase; proteção de rotas.",
    ],
  },
];
