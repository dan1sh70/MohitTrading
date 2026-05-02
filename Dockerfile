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
ENV PORT=4000
ENV DB_HOST=mysql
ENV DB_PORT=3306
ENV DB_USER=mysql
ENV DB_PASSWORD=r1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK
ENV DB_NAME=default
ENV REDIS_URL=redis://:redis_password_123@redis:6379
ENV JWT_SECRET=replace_with_a_long_secret
ENV JWT_EXPIRES_IN=1d
ENV CLIENT_ORIGIN=http://localhost:5173
ENV ADMIN_EMAIL=admin@papertrading.local
ENV ADMIN_PASSWORD=Admin123!
ENV TRADER_PASSWORD=Trader123!
ENV ALPHA_VANTAGE_API_KEY=demo
ENV DHANHQ_API_KEY=demo
ENV ENABLE_CRYPTO_POLLING=true

RUN apk add --no-cache dumb-init curl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:4000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "src/server.js"]