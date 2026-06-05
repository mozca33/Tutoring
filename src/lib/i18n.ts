// i18n leve. Hoje só pt-BR (idioma padrão da plataforma), mas a estrutura
// permite adicionar outros idiomas sem espalhar strings pelo código:
// basta criar outro dicionário com as mesmas chaves e trocar o `locale`.

export type Locale = "pt-BR";

const pt = {
  "nav.lessons": "Aulas",
  "nav.materials": "Materiais",
  "nav.messages": "Mensagens",
  "nav.students": "Meus Alunos",
  "nav.profile": "Perfil",
  "nav.subscription": "Assinatura",
  "nav.tasks": "Tarefas",
  "common.teacher": "Professor",
  "common.student": "Aluno",
  "common.light": "Claro",
  "common.dark": "Escuro",
  "common.signout": "Sair",
  "common.code": "Código",
} as const;

export type MessageKey = keyof typeof pt;

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  "pt-BR": pt,
};

export const DEFAULT_LOCALE: Locale = "pt-BR";

/** Tradução por chave; cai no texto da chave caso falte. */
export function t(key: MessageKey, locale: Locale = DEFAULT_LOCALE): string {
  return dictionaries[locale]?.[key] ?? pt[key] ?? key;
}
