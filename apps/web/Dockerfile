FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
RUN corepack enable pnpm && pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm --filter @agentmou/web build

FROM base AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 web

COPY --from=builder --chown=web:nodejs /app/apps/web ./
COPY --from=builder --chown=web:nodejs /app/node_modules /app/node_modules

USER web

EXPOSE 3000

CMD ["../../node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
