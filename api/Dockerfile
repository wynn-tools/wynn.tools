# Build context = repo root (frontend app/ must be present for tsup to bundle).
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY app ./app
COPY api ./api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @wynn.tools/api build
RUN pnpm deploy --filter @wynn.tools/api --prod --legacy /deploy

FROM node:22-slim AS runtime
WORKDIR /app
COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /repo/api/dist ./dist
COPY --from=build /repo/api/drizzle ./drizzle
COPY --from=build /repo/api/drizzle.config.ts ./drizzle.config.ts
ENV NODE_ENV=production
# Run migrations, then start.
CMD ["sh", "-c", "node_modules/.bin/drizzle-kit migrate && node dist/index.js"]
