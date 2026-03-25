FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY services/openclaw-runtime/package.json ./services/openclaw-runtime/
COPY packages/ ./packages/
RUN pnpm i --frozen-lockfile

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @agentmou/openclaw-runtime build
RUN pnpm deploy --filter @agentmou/openclaw-runtime --prod /prod/openclaw-runtime

FROM base AS runner
WORKDIR /prod/openclaw-runtime
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 openclaw

COPY --from=builder --chown=openclaw:nodejs /prod/openclaw-runtime ./

USER openclaw

EXPOSE 3003
ENV PORT=3003
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]
