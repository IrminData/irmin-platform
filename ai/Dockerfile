# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
# Compile TypeScript and bundle to ./dist (no Sentry here)
RUN pnpm run build

# ---------- runner ----------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Enable corepack for pnpm
RUN corepack enable

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set memory limit for Node.js
ENV NODE_OPTIONS="--max-old-space-size=8192"

# App files
COPY --from=build /app/dist /app/dist
COPY --from=build /app/src/database /app/src/database
COPY --from=build /app/llm-docs /app/llm-docs
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules /app/node_modules

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Non-secret Sentry config; token comes from Railway at runtime
ENV SENTRY_ORG=irmin-dw
ENV SENTRY_PROJECT=irmin-ai

# Fastify will bind to HOST/PORT from env; Railway sets PORT
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Start the Fastify server (Sentry SDK will handle sourcemap uploads automatically)
CMD ["node", "dist/server.js"]
