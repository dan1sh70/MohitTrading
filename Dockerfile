# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Runtime stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8808
ENV DB_HOST=mysql
ENV DB_PORT=3306
ENV DB_USER=mysql
ENV DB_PASSWORD=r1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK
ENV DB_NAME=default
ENV REDIS_URL=redis://redis:6379
ENV JWT_SECRET=replace_with_a_long_secret
ENV JWT_EXPIRES_IN=1d
ENV CLIENT_ORIGIN=http://localhost:5173
ENV ADMIN_EMAIL=admin@papertrading.local
ENV ADMIN_PASSWORD=Admin123!
ENV TRADER_PASSWORD=Trader123!
ENV ALPHA_VANTAGE_API_KEY=demo
# DhanHQ integration removed; Upstox is used instead for Indian stocks
ENV MARKETAUX_API_KEY=7OSYVZ7vixIYPBAjNH5r8hYuskViy6SHwgbLpi3S
ENV UPSTOX_API_KEY=2fc81491-6fbd-43bb-8b15-955d8e0a727f
ENV UPSTOX_API_SECRET=kklm46v5r9
ENV UPSTOX_REDIRECT_URI=http://localhost:8808/api/auth/upstox/callback
ENV ENABLE_CRYPTO_POLLING=false

RUN apk add --no-cache dumb-init curl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

EXPOSE 8808

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:8808/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "src/server.js"]