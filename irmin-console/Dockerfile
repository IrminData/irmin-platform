FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS builder
RUN corepack enable
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS=--max-old-space-size=8192

# Set environment variable placeholders.
#
# Values are unique marker tokens (wrapped in `__RAILWAY_ENV_..._ENV__`)
# rather than the bare variable name. Next.js inlines `process.env.X` at
# build time with whatever the placeholder value is, so these tokens end
# up in the built JS. At container startup, entrypoint.sh's sed replaces
# the tokens with the real runtime values injected by Railway.
#
# The token shape matters: earlier we used the variable name as its own
# placeholder value (ENV X=X), which meant the raw string "NEXT_PUBLIC_X"
# appeared in the bundle both as string values AND as object-literal
# property keys (see src/config/env.client.ts). sed's find-and-replace
# matched both, rewriting bare identifiers into invalid JS like
# `{ https://host.com: "https://host.com" }` and crashing chunk load at
# runtime with `SyntaxError: Unexpected token ':'`. Tokens with the
# `__RAILWAY_ENV_..._ENV__` shape cannot appear as JS identifiers, so sed
# only touches the intended string values.
ENV NEXT_PUBLIC_BASE_URL=__RAILWAY_ENV_NEXT_PUBLIC_BASE_URL_ENV__
ENV NEXT_PUBLIC_WEBSITE_URL=__RAILWAY_ENV_NEXT_PUBLIC_WEBSITE_URL_ENV__
ENV NEXT_PUBLIC_REVALIDATE=__RAILWAY_ENV_NEXT_PUBLIC_REVALIDATE_ENV__
ENV NEXT_PUBLIC_API_URL=__RAILWAY_ENV_NEXT_PUBLIC_API_URL_ENV__
ENV NEXT_PUBLIC_AI_API_URL=__RAILWAY_ENV_NEXT_PUBLIC_AI_API_URL_ENV__
ENV NEXT_PUBLIC_SENTRY_DSN=__RAILWAY_ENV_NEXT_PUBLIC_SENTRY_DSN_ENV__
ENV NEXT_PUBLIC_POSTHOG_KEY=__RAILWAY_ENV_NEXT_PUBLIC_POSTHOG_KEY_ENV__
ENV NEXT_PUBLIC_POSTHOG_HOST=__RAILWAY_ENV_NEXT_PUBLIC_POSTHOG_HOST_ENV__
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=__RAILWAY_ENV_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_ENV__
ENV NEXT_PUBLIC_NOVU_APP_ID=__RAILWAY_ENV_NEXT_PUBLIC_NOVU_APP_ID_ENV__
ENV NEXT_PUBLIC_BILLING_DISABLED=__RAILWAY_ENV_NEXT_PUBLIC_BILLING_DISABLED_ENV__
ENV NEXT_PUBLIC_API_DOCS_URL=__RAILWAY_ENV_NEXT_PUBLIC_API_DOCS_URL_ENV__

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Copy the source code
COPY . .

# Build the application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=8192

# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy entrypoint script
COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint script
ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "--max-old-space-size=8192", "server.js"]