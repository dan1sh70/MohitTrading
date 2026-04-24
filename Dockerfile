# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_HOST=72.62.192.34
ENV DB_PORT=8965
ENV DB_USER=mysql
ENV DB_PASSWORD=r1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK
ENV DB_NAME=default
ENV REDIS_URL=redis://localhost:6379
ENV JWT_SECRET=replace_with_a_long_secret
ENV JWT_EXPIRES_IN=1d
ENV CLIENT_ORIGIN=http://localhost:5173
ENV ADMIN_EMAIL=admin@papertrading.local
ENV ADMIN_PASSWORD=Admin123!
ENV TRADER_PASSWORD=Trader123!
ENV ALPHA_VANTAGE_API_KEY=demo
ENV DHANHQ_API_KEY=demo
ENV ENABLE_CRYPTO_POLLING=false

# Install dumb-init and wget for healthchecks
RUN apk add --no-cache dumb-init wget

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
