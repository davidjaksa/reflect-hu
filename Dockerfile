# ── Stage 1: install deps (Alpine for fast pnpm install) ─────────────────────
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: build Next.js (Debian slim for glibc / onnxruntime-node) ─────────
FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Stage 3: production web server (Debian slim) ──────────────────────────────
FROM node:22-slim AS runner
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libraw-bin \
    wget \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

# ── Stage 4: background worker (Debian slim) ──────────────────────────────────
FROM node:22-slim AS worker
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libraw-bin \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
CMD ["node", "scripts/worker.mjs"]
