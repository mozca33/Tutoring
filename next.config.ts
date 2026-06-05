import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Avatares públicos do Supabase Storage
      { protocol: "https", hostname: "eddzzyhpiozpfbplmixl.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

// Monitoramento opcional (Sentry, plano grátis): só embrulha a config quando
// SENTRY_DSN está definido, evitando avisos/uploads quando não configurado.
export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      // Sem authToken não há upload de sourcemaps — o restante segue funcionando.
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
