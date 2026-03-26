# Production Dockerfile for Mikrogestor SaaS
FROM node:20-alpine AS base

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat git
WORKDIR /app

COPY package.json ./
RUN npm install

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables must be present at build time for some Next.js optimizations
# but secrets should be handled at runtime.
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# To avoid prisma throwing an error during build because the database doesn't exist yet
# We need to provide a dummy URL during build time just to satisfy Prisma validation step
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN ./node_modules/.bin/prisma generate
RUN npm run build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install runtime dependencies for VPN monitoring (WireGuard)
RUN apk add --no-cache wireguard-tools iproute2 bash postgresql-client curl iptables
RUN npm install -g prisma@6.2.1 tsx typescript
RUN npm install bcryptjs @prisma/client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the entrypoint script and VPN management scripts
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts/ /app/scripts/
RUN chmod +x /app/docker-entrypoint.sh

# Create storage directory and set permissions
RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage

# WireGuard needs root for some operations, but we'll try to keep it safe.
# We don't switch to USER nextjs here to allow the entrypoint to run migrations and wg commands.

EXPOSE 3000

ENV PORT 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
