# Docker Setup Guide

## Overview
This application is now fully dockerized with MySQL, Redis, and the Node.js backend running in containers using Docker Compose.

## Prerequisites
- Docker Desktop or Docker Engine installed
- Docker Compose installed (comes with Docker Desktop)
- Git

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/mrakmondal6612/PapperTradingServer.git
cd PapperTradingServer
```

### 2. Configure Environment
Copy the example environment file and update with your values:
```bash
cp .env.example .env
```

Edit `.env` and update the following for production:
- `JWT_SECRET` - Strong random string
- `ADMIN_PASSWORD` - Strong password
- `TRADER_PASSWORD` - Strong password
- `MYSQL_ROOT_PASSWORD` - Strong password
- `DB_PASSWORD` - Strong password
- API keys if needed

### 3. Start Services
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### 4. Initialize Database (if needed)
```bash
# The database will auto-initialize on first run using schema.sql
# If you need to reinitialize:
docker-compose exec mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -D paper_trading < ./src/db/schema.sql
```

### 5. Verify Services
```bash
# Check service health
docker-compose ps

# Test backend
curl http://localhost:4000/health

# Connect to MySQL
docker-compose exec mysql mysql -u root -p

# Connect to Redis
docker-compose exec redis redis-cli
```

## Common Commands

### Development
```bash
# Start services
docker-compose up

# Stop services
docker-compose down

# Rebuild images
docker-compose build

# View logs
docker-compose logs -f [service-name]
# service-name: backend, mysql, redis
```

### Database Management
```bash
# Access MySQL
docker-compose exec mysql mysql -u paper_user -ppaperpass123 paper_trading

# Backup database
docker-compose exec mysql mysqldump -u paper_user -ppaperpass123 paper_trading > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u paper_user -ppaperpass123 paper_trading < backup.sql
```

### Redis Management
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis
docker-compose exec redis redis-cli MONITOR
```

### View Volumes and Data
```bash
# List volumes
docker volume ls

# Inspect specific volume
docker volume inspect paper-trading-network_mysql_data
```

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker-compose logs

# Rebuild everything
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Database connection fails
- Ensure MySQL container is healthy: `docker-compose ps`
- Check if port 3306 is available
- Verify DB credentials in `.env`

### Redis connection fails
- Check if Redis container is running: `docker-compose ps`
- Verify `REDIS_URL` in `.env`
- Ensure port 6379 is available

### Port already in use
Modify ports in `.env`:
```
MYSQL_PORT=3307      # instead of 3306
REDIS_PORT=6380      # instead of 6379
PORT=4001            # instead of 4000
```

Then restart services: `docker-compose down && docker-compose up -d`

## Production Deployment

### Security Checklist
- [ ] Change all default passwords in `.env`
- [ ] Use strong `JWT_SECRET` (min 32 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS/SSL certificates
- [ ] Implement rate limiting
- [ ] Set up proper logging
- [ ] Back up database regularly
- [ ] Use secrets management (AWS Secrets, HashiCorp Vault, etc.)

### Environment Variables for Production
Update these before deployment:
```env
NODE_ENV=production
JWT_SECRET=<very-long-random-string>
ADMIN_PASSWORD=<strong-password>
TRADER_PASSWORD=<strong-password>
MYSQL_ROOT_PASSWORD=<strong-password>
DB_PASSWORD=<strong-password>
CLIENT_ORIGIN=https://your-frontend-domain.com
ENABLE_CRYPTO_POLLING=true  # if needed
```

### Scaling
For production scaling, consider:
- Using managed databases (AWS RDS, Google Cloud SQL)
- Using managed Redis (AWS ElastiCache, Redis Cloud)
- Using container orchestration (Kubernetes, Docker Swarm)
- Load balancing between multiple backend instances

### Docker Hub (Optional)
```bash
# Build and push to registry
docker build -t your-registry/paper-trading-backend:latest .
docker push your-registry/paper-trading-backend:latest

# Use in docker-compose.yml
# backend:
#   image: your-registry/paper-trading-backend:latest
```

## File Structure
```
├── Dockerfile              # Node.js application image
├── docker-compose.yml      # Orchestration for all services
├── .dockerignore          # Files excluded from Docker build
├── .env.example           # Example environment variables
├── .env                   # Production environment (git ignored)
└── src/
    ├── db/
    │   └── schema.sql     # Initialized automatically by docker-compose
    └── ...
```

## Service Details

### Backend
- **Image**: Node.js 20 Alpine (multi-stage build)
- **Port**: 4000 (configurable via PORT env)
- **Health Check**: Every 30s
- **Restart Policy**: unless-stopped
- **User**: Non-root for security

### MySQL
- **Image**: MySQL 8.0
- **Port**: 3306 (configurable via MYSQL_PORT env)
- **Auto-init**: Loads `schema.sql` on first run
- **Volume**: Persistent `mysql_data`

### Redis
- **Image**: Redis 7 Alpine
- **Port**: 6379 (configurable via REDIS_PORT env)
- **Persistence**: Enabled (AOF)
- **Volume**: Persistent `redis_data`

## Cleanup

### Remove everything (keep volumes)
```bash
docker-compose down
```

### Remove everything including volumes (⚠️ data loss)
```bash
docker-compose down -v
```

### Remove specific service
```bash
docker-compose down [service-name]
```

---

For more help, check the logs: `docker-compose logs -f`
