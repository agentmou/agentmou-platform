FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY services/internal-ops/package.json ./services/internal-ops/
COPY packages/ ./packages/
RUN pnpm i --frozen-lockfile

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @agentmou/internal-ops build
RUN pnpm deploy --filter @agentmou/internal-ops --prod /prod/internal-ops

FROM base AS runner
WORKDIR /prod/internal-ops
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 internalops

COPY --from=builder --chown=internalops:nodejs /prod/internal-ops ./

USER internalops

EXPOSE 3002
ENV PORT=3002
ENV HOST=0.0.0.0

# Workspace packages (@agentmou/contracts, @agentmou/db, etc.) publish TypeScript
# entrypoints. Use tsx at runtime (same as api and worker images) so imports resolve.
CMD ["npx", "tsx", "dist/index.js"]
