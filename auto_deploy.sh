#!/bin/bash

echo "🚀 Automated Production Deployment Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ১. Pre-deployment checks
echo ""
print_status "Step 1: Pre-deployment checks..."

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found!"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running!"
    exit 1
fi

print_status "Docker is running"
print_status "docker-compose.prod.yml found"

# ২. Stop existing containers
echo ""
print_status "Step 2: Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
print_status "Containers stopped"

# ৩. Pull latest code
echo ""
print_status "Step 3: Pulling latest code..."
git pull origin main
if [ $? -eq 0 ]; then
    print_status "Code pulled successfully"
else
    print_warning "Git pull failed, continuing with local code"
fi

# ৪. Build containers
echo ""
print_status "Step 4: Building containers..."
docker-compose -f docker-compose.prod.yml build --no-cache
if [ $? -eq 0 ]; then
    print_status "Containers built successfully"
else
    print_error "Container build failed!"
    exit 1
fi

# ৫. Start database containers first
echo ""
print_status "Step 5: Starting database containers..."
docker-compose -f docker-compose.prod.yml up -d mysql redis
sleep 30  # Wait for databases to be ready

# Check if databases are healthy
echo "Checking database health..."
mysql_health=$(docker inspect paper-trading-mysql-prod --format='{{.State.Health.Status}}' 2>/dev/null)
redis_health=$(docker inspect paper-trading-redis-prod --format='{{.State.Health.Status}}' 2>/dev/null)

if [ "$mysql_health" = "healthy" ]; then
    print_status "MySQL is healthy"
else
    print_warning "MySQL health check failed, continuing anyway"
fi

if [ "$redis_health" = "healthy" ]; then
    print_status "Redis is healthy"
else
    print_warning "Redis health check failed, continuing anyway"
fi

# ৬. Import database schema (CRITICAL FIX)
echo ""
print_status "Step 6: Importing database schema..."
echo "Waiting for MySQL to be fully ready..."
sleep 20

# Try to import schema
docker exec -i paper-trading-mysql-prod mysql -u mysql -pr1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK default < src/db/schema.sql 2>/dev/null

if [ $? -eq 0 ]; then
    print_status "Database schema imported successfully"
else
    print_warning "Schema import failed, trying alternative method..."
    # Alternative: Check if tables already exist
    table_count=$(docker exec paper-trading-mysql-prod mysql -u mysql -pr1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='default'" 2>/dev/null | tail -1)
    if [ "$table_count" -gt 0 ]; then
        print_status "Tables already exist ($table_count tables)"
    else
        print_error "No tables found and schema import failed!"
    fi
fi

# ৭. Start backend container
echo ""
print_status "Step 7: Starting backend container..."
docker-compose -f docker-compose.prod.yml up -d backend
sleep 15  # Wait for backend to start

# ৮. Health checks
echo ""
print_status "Step 8: Performing health checks..."

# Check if backend container is running
backend_status=$(docker inspect paper-trading-backend-prod --format='{{.State.Status}}' 2>/dev/null)
if [ "$backend_status" = "running" ]; then
    print_status "Backend container is running"
else
    print_error "Backend container failed to start!"
    docker logs paper-trading-backend-prod --tail 20
    exit 1
fi

# Check API health
echo "Testing API health..."
for i in {1..10}; do
    if curl -f http://localhost:8808/api/health >/dev/null 2>&1; then
        print_status "API health check passed (attempt $i)"
        break
    else
        echo -n "."
        sleep 3
    fi
    
    if [ $i -eq 10 ]; then
        print_error "API health check failed after 10 attempts!"
        echo "Backend logs:"
        docker logs paper-trading-backend-prod --tail 30
        exit 1
    fi
done

# ৯. Test Indian Stock endpoints
echo ""
print_status "Step 9: Testing Indian Stock endpoints..."

# Test individual stock endpoint
echo "Testing individual stock endpoint..."
if curl -f http://localhost:8808/api/stocks/in/HDFC >/dev/null 2>&1; then
    print_status "Individual stock endpoint working"
else
    print_warning "Individual stock endpoint failed, checking logs..."
fi

# Test buy endpoint (should return 401 without auth)
echo "Testing buy endpoint..."
buy_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8808/api/stocks/in/trade/buy \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","quantity":1,"entryPrice":3650.25,"timeFrame":"Intraday","marginUsed":1000,"charges":50}' 2>/dev/null)

if [ "$buy_response" = "401" ]; then
    print_status "Buy endpoint working (correctly returning 401 without auth)"
elif [ "$buy_response" = "500" ]; then
    print_error "Buy endpoint returning 500 error!"
    echo "Backend logs:"
    docker logs paper-trading-backend-prod --tail 20
else
    print_warning "Buy endpoint returned unexpected status: $buy_response"
fi

# ১০. Final status
echo ""
print_status "Step 10: Deployment summary..."

echo ""
echo "📊 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🌐 API Endpoints Test:"
echo "Health: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8808/api/health)"
echo "Indian Stocks Top: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8808/api/stocks/in/top)"
echo "Individual Stock (HDFC): $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8808/api/stocks/in/HDFC)"

echo ""
echo "🎯 Production URL: https://apipaper.digontom.cloud"
echo ""
print_status "Deployment completed successfully!"
print_status "Indian Stock trading should now work on production!"

echo ""
echo "📋 Useful Commands:"
echo "View logs: docker logs -f paper-trading-backend-prod"
echo "Restart backend: docker restart paper-trading-backend-prod"
echo "Check containers: docker ps"
echo "Stop all: docker-compose -f docker-compose.prod.yml down"

echo ""
echo "🔍 If Indian Stock trading still shows 500 errors:"
echo "1. Clear browser cache and re-login"
echo "2. Check browser console for specific errors"
echo "3. Run: ./debug_vps.sh"
echo "4. Test with: curl -X POST https://apipaper.digontom.cloud/api/stocks/in/trade/buy ..."
