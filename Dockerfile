ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV MONGODB_URI=mongodb://127.0.0.1:27017/build
ENV AUTH_SECRET=build-only-not-used

# NEXT_PUBLIC_* is inlined at build time. Pass --build-arg from CI if you
# need custom RPC endpoints instead of the publicnode fallbacks.
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_BLOCKCHAIN_NETWORK=sepolia
ARG NEXT_PUBLIC_MAINNET_RPC_URL
ARG NEXT_PUBLIC_SEPOLIA_RPC_URL
ARG NEXT_PUBLIC_MAINNET_WS_URL
ARG NEXT_PUBLIC_SEPOLIA_WS_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_BLOCKCHAIN_NETWORK=$NEXT_PUBLIC_BLOCKCHAIN_NETWORK
ENV NEXT_PUBLIC_MAINNET_RPC_URL=$NEXT_PUBLIC_MAINNET_RPC_URL
ENV NEXT_PUBLIC_SEPOLIA_RPC_URL=$NEXT_PUBLIC_SEPOLIA_RPC_URL
ENV NEXT_PUBLIC_MAINNET_WS_URL=$NEXT_PUBLIC_MAINNET_WS_URL
ENV NEXT_PUBLIC_SEPOLIA_WS_URL=$NEXT_PUBLIC_SEPOLIA_WS_URL

RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV BLOCKCHAIN_NETWORK=sepolia

COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir .next && chown node:node .next
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
