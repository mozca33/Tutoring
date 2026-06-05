import * as Sentry from "@sentry/nextjs";

// Monitoramento opcional no cliente: só ativa se NEXT_PUBLIC_SENTRY_DSN estiver definido.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  });
}

// Instrumenta as transições de rota do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
