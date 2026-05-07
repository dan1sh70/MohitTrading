# Quick Fix Guide for VPS Docker Issues

## 🚨 Problem: Indian Stock Trading 500 Errors After Docker Deploy

### **Immediate Debugging Steps:**

#### **১. VPS এ Debug Script Run করুন**
```bash
cd /path/to/your/backend
chmod +x debug_vps.sh
./debug_vps.sh
```

#### **২. Common Issues & Fixes:**

**Issue 1: Database Tables Missing**
```bash
# Fix: Database schema import
docker exec -i paper-trading-mysql-prod mysql -u mysql -pr1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK default < src/db/schema.sql
```

**Issue 2: Backend Can't Connect to Database**
```bash
# Fix: Restart containers in correct order
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d mysql redis
sleep 30
docker-compose -f docker-compose.prod.yml up -d backend
```

**Issue 3: Environment Variables Not Loading**
```bash
# Fix: Check environment in container
docker exec paper-trading-backend-prod env | grep -E "(DB_|REDIS_|JWT_)"
```

**Issue 4: Port Conflicts**
```bash
# Fix: Check port usage
netstat -tulpn | grep 8808
# Kill if needed
sudo fuser -k 8808/tcp
```

#### **৩. Quick Test Commands:**
```bash
# Test database connection
docker exec paper-trading-backend-prod node -e "
import { env } from './src/config/env.js';
console.log('Database:', env.databaseUrl);
console.log('Redis:', env.redisUrl);
console.log('JWT Secret:', env.jwtSecret ? 'Set' : 'NOT SET');
"

# Test API directly
curl -X POST http://localhost:8808/api/stocks/in/trade/buy \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","quantity":1,"entryPrice":3650.25,"timeFrame":"Intraday","marginUsed":1000,"charges":50}' \
  -v
```

### **🔧 Most Likely Issues:**

#### **১. Database Schema Not Imported**
Docker containers start করলেও `schema.sql` import হয়নি:
```bash
# Manual import
docker exec -i paper-trading-mysql-prod mysql -u mysql -pr1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK default < src/db/schema.sql
```

#### **২. JWT Secret Mismatch**
Frontend আর Backend JWT secret match করছে না:
```bash
# Check backend JWT
docker exec paper-trading-backend-prod env | grep JWT_SECRET

# Frontend re-login করুন (token refresh)
```

#### **৩. Environment Variable Issues**
`.env.production` file properly load হচ্ছে না:
```bash
# Copy env file to container
docker cp .env.production paper-trading-backend-prod:/app/.env.production

# Restart container
docker restart paper-trading-backend-prod
```

### **🚀 Quick Deploy Fix:**

```bash
# Complete redeploy with fixes
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait 30 seconds
sleep 30

# Import schema manually
docker exec -i paper-trading-mysql-prod mysql -u mysql -pr1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK default < src/db/schema.sql

# Restart backend
docker restart paper-trading-backend-prod
```

### **📋 Success Check:**

```bash
# Test individual stock
curl http://localhost:8808/api/stocks/in/HDFC

# Test buy (should show proper error, not 500)
curl -X POST http://localhost:8808/api/stocks/in/trade/buy \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","quantity":1,"entryPrice":3650.25,"timeFrame":"Intraday","marginUsed":1000,"charges":50}'
```

### **🔍 If Still Issues:**

1. **Check container resources:** `docker stats`
2. **Check disk space:** `df -h`
3. **Check memory:** `free -h`
4. **Check network:** `netstat -tulpn | grep 8808`

### **📞 Last Resort:**

```bash
# Reset everything
docker-compose -f docker-compose.prod.yml down -v --rmi all
docker system prune -f
docker-compose -f docker-compose.prod.yml up -d
```

**Deploy করার পর এই commands run করে test করুন!**
