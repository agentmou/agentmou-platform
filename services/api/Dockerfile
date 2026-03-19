FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY services/api/package.json ./services/api/
COPY packages/ ./packages/
RUN pnpm i --frozen-lockfile

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @agentmou/api build
RUN pnpm deploy --filter @agentmou/api --prod /prod/api

FROM base AS runner
WORKDIR /prod/api
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api

COPY --from=builder --chown=api:nodejs /prod/api ./
COPY --from=builder --chown=api:nodejs /app/catalog /prod/catalog
COPY --from=builder --chown=api:nodejs /app/workflows /prod/workflows

USER api

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["npx", "tsx", "dist/index.js"]
