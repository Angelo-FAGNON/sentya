# Image unique à plusieurs cibles pour le monorepo Sentya :
# - outils : espace de travail complet (migrations Prisma et seed) ;
# - bot    : bot Telegram empaqueté, avec ffmpeg pour les réponses audio ;
# - web    : site Next.js en mode "standalone".

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
WORKDIR /app

# --- Installation complète et construction ---
FROM base AS construction
COPY . .
# Magasin pnpm conservé entre les constructions : un changement de fichier ne retélécharge
# pas tous les paquets (ni les moteurs Prisma). Parallélisme réduit et relances allongées pour les connexions lentes.
RUN --mount=type=cache,id=sentya-pnpm,target=/pnpm/store \
    --mount=type=cache,id=sentya-prisma,target=/root/.cache/prisma \
    pnpm install --frozen-lockfile --store-dir /pnpm/store \
      --network-concurrency 8 --fetch-retries 6 --fetch-timeout 120000
RUN pnpm --filter @sentya/bot build
RUN if [ -d apps/web ]; then pnpm --filter @sentya/web build; fi

# --- Outils : migrations et seed ---
FROM construction AS outils
WORKDIR /app/packages/db
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed"]

# --- Bot : dépendances de production seulement ---
FROM construction AS deploiement-bot
# Mêmes caches que l'installation : le déploiement réutilise les paquets déjà téléchargés.
RUN --mount=type=cache,id=sentya-pnpm,target=/pnpm/store \
    --mount=type=cache,id=sentya-pnpm-meta,target=/root/.cache/pnpm \
    pnpm --filter @sentya/bot deploy --legacy --prod --prefer-offline --store-dir /pnpm/store \
      --network-concurrency 8 --fetch-retries 6 --fetch-timeout 120000 /out \
  && cp -r /app/apps/bot/dist /out/dist

FROM node:22-alpine AS bot
RUN apk add --no-cache ffmpeg && addgroup -S sentya && adduser -S sentya -G sentya
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deploiement-bot --chown=sentya:sentya /out ./
USER sentya
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:8080/health || exit 1
CMD ["node", "dist/index.js"]

# --- Web : sortie "standalone" de Next.js ---
FROM node:22-alpine AS web
RUN addgroup -S sentya && adduser -S sentya -G sentya
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=construction --chown=sentya:sentya /app/apps/web/.next/standalone ./
COPY --from=construction --chown=sentya:sentya /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=construction --chown=sentya:sentya /app/apps/web/public ./apps/web/public
USER sentya
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
