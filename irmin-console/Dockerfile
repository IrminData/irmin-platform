FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS builder
RUN corepack enable
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS=--max-old-space-size=3000

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock ./
COPY .yarnrc.yml ./
COPY .yarn ./.yarn
RUN echo 'nodeLinker: "node-modules"' > ./.yarnrc.yml
RUN \
    if [ -f yarn.lock ]; then yarn install --immutable; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Rebuild the source code only when needed
COPY ./src ./src
COPY ./public ./public
COPY ./README.md ./
COPY ./next.config.mjs ./tsconfig.json ./
COPY ./sentry.client.config.ts ./sentry.edge.config.ts ./sentry.server.config.ts ./
COPY ./postcss.config.js ./tailwind.config.ts ./

# Build the application
RUN \
    if [ -f yarn.lock ]; then yarn build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

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

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]