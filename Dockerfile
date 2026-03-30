FROM node:21-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:21-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments para variables de entorno
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_CHAIN_NAME
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_TOKEN_ADDRESS
ARG NEXT_PUBLIC_FAUCET_ADDRESS
ARG NEXT_PUBLIC_STAKING_ADDRESS

# Set environment variables during build
ENV NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID}
ENV NEXT_PUBLIC_CHAIN_NAME=${NEXT_PUBLIC_CHAIN_NAME}
ENV NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL}
ENV NEXT_PUBLIC_TOKEN_ADDRESS=${NEXT_PUBLIC_TOKEN_ADDRESS}
ENV NEXT_PUBLIC_FAUCET_ADDRESS=${NEXT_PUBLIC_FAUCET_ADDRESS}
ENV NEXT_PUBLIC_STAKING_ADDRESS=${NEXT_PUBLIC_STAKING_ADDRESS}

RUN npm run build

FROM node:21-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", "server.js"]
