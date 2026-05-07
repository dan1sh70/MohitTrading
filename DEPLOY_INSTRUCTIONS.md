# Docker Redeploy Instructions for VPS

## 🚀 Production VPS এ Redeploy করার নিয়ম

### **Step 1: VPS এ Connect করুন**
```bash
ssh your_username@your_vps_ip
```

### **Step 2: Project Directory এ যান**
```bash
cd /path/to/your/project/backend
```

### **Step 3: Current Containers Stop করুন**
```bash
docker-compose down
```

### **Step 4: Latest Code Pull করুন**
```bash
git pull origin main
# অথবা
git pull origin your-branch
```

### **Step 5: Build & Redeploy করুন**

#### **Option A: Production Docker Compose Use করে**
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

#### **Option B: Regular Docker Compose Use করে**
```bash
docker-compose build --no-cache
docker-compose up -d
```

### **Step 6: Containers Status Check করুন**
```bash
docker ps
```

### **Step 7: Logs Check করুন**
```bash
# Backend logs
docker logs paper-trading-backend-prod

# MySQL logs  
docker logs paper-trading-mysql-prod

# Redis logs
docker logs paper-trading-redis-prod
```

### **Step 8: API Test করুন**
```bash
# Health check
curl http://localhost:8808/api/health

# Indian stocks test
curl http://localhost:8808/api/stocks/in/top

# Individual stock test
curl http://localhost:8808/api/stocks/in/HDFC
```

### **Step 9: Frontend Test করুন**
Browser এ open করুন:
```
https://apipaper.digontom.cloud
```

Indian Stock Buy/Sell test করুন।

## 🔧 **Troubleshooting**

### **Problem: Container Start হচ্ছে না**
```bash
# Force cleanup
docker-compose down -v
docker system prune -f

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

### **Problem: Database Connection Error**
```bash
# MySQL container check
docker exec -it paper-trading-mysql-prod mysql -u mysql -p

# Database tables check
mysql> use default;
mysql> show tables;
mysql> select * from users limit 5;
```

### **Problem: Port Already in Use**
```bash
# Port kill করুন
sudo fuser -k 8808/tcp

# অথবা container restart করুন
docker-compose restart backend
```

### **Problem: Permission Issues**
```bash
# Docker permissions fix
sudo usermod -aG docker $USER
sudo chmod 666 /var/run/docker.sock
```

## 📋 **Quick Commands**

```bash
# Full Redeploy (One Command)
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Logs Live View
docker-compose logs -f backend

# Container Restart
docker-compose restart backend

# Database Access
docker exec -it paper-trading-mysql-prod mysql -u mysql -pr1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK

# Redis Access
docker exec -it paper-trading-redis-prod redis-cli -a redis_password_123
```

## ✅ **Success Indicators**

### **Containers Running:**
- ✅ paper-trading-backend-prod (Up)
- ✅ paper-trading-mysql-prod (Up)  
- ✅ paper-trading-redis-prod (Up)

### **API Endpoints Working:**
- ✅ `/api/health` returns 200
- ✅ `/api/stocks/in/top` returns 200
- ✅ Indian Stock Buy/Sell works

### **Frontend Working:**
- ✅ No WebSocket errors
- ✅ Indian Stock prices load
- ✅ Buy/Sell buttons work

## 🚨 **Important Notes**

1. **Always use `--no-cache`** when rebuilding for production
2. **Check logs** after every deploy
3. **Test Indian Stock trading** specifically
4. **Backup database** before major changes
5. **Monitor container resources** on VPS

## 📞 **If Still Issues:**

1. Check VPS resources (RAM/CPU)
2. Verify domain DNS settings
3. Check firewall rules (port 8808)
4. Verify SSL certificates
5. Contact VPS provider if needed
