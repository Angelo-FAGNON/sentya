// Configuration Next.js du site public, du back-office et de l'espace partenaire.
// La politique de sécurité du contenu (CSP) est posée par proxy.ts, avec un nonce par requête.
// Les autres en-têtes de sécurité sont posés ici, sur toutes les routes (API et fichiers statiques compris).
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const racineMonorepo = fileURLToPath(new URL("../..", import.meta.url));

const ENTETES_SECURITE = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: racineMonorepo,
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@sentya/core", "@sentya/db"],
  serverExternalPackages: ["argon2", "pg", "@prisma/client", "@prisma/adapter-pg", "pino"],
  async headers() {
    return [{ source: "/:path*", headers: ENTETES_SECURITE }];
  },
};

export default config;
