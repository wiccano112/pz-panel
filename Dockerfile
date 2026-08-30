# Stage 1: Dependencies
FROM node:current-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm@11.24.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds


# Stage 2: Builder
FROM node:current-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@11.24.0

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment and build standalone bundle
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm run build

# Stage 3: Runner
FROM node:current-alpine AS runner
WORKDIR /app

# Install Docker CLI and Compose plugin to allow container management
RUN apk add --no-cache docker-cli docker-cli-compose bash

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Default server container environment variables (can be overridden by compose env_file)
ENV PZ_SERVER_DIR=/pz-server
ENV PZ_SERVER_NAME=servertest
ENV PZ_DOCKER_CONTAINER=pz-server


# Copy standalone output and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Start Next.js standalone server
CMD ["node", "server.js"]
