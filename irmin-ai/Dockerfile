 # ---- Base Image ----
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=8192

# ---- Builder Stage ----
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- Runner Stage ----
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system app && adduser --system --ingroup app app
USER app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# If you need Drizzle migrations at runtime, copy migrations:
COPY --from=builder /app/src/database ./src/database

EXPOSE 3000
CMD ["node", "dist/server.js"]