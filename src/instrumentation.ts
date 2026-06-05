import * as Sentry from "@sentry/nextjs";

// Monitoramento opcional: só ativa se SENTRY_DSN estiver definido (plano grátis do Sentry).
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}

// Captura erros de Server Components, Route Handlers e Server Actions.
export const onRequestError = Sentry.captureRequestError;
