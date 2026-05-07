#!/bin/bash

echo "🚀 VPS Debug Script for Indian Stock Trading Issues"
echo "================================================="

# ১. Container Status Check
echo "📋 Checking Container Status..."
docker ps -a

echo ""
echo "📋 Checking Backend Logs..."
docker logs paper-trading-backend-prod --tail 50

echo ""
echo "📋 Checking MySQL Logs..."
docker logs paper-trading-mysql-prod --tail 20

echo ""
echo "📋 Checking Redis Logs..."
docker logs paper-trading-redis-prod --tail 20

echo ""
echo "📋 Testing Database Connection..."
docker exec paper-trading-mysql-prod mysql -u mysql -pr1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK -e "SELECT COUNT(*) as user_count FROM users;"

echo ""
echo "📋 Testing Indian Stock Tables..."
docker exec paper-trading-mysql-prod mysql -u mysql -pr1Wk6teTIRAsFp89tBNkkl30M3FosEEkn7cXyTPFtz74Jeqn5IfRMmhiq2gLoGQK -e "SHOW TABLES LIKE '%indian%';"

echo ""
echo "📋 Testing API Health..."
curl -f http://localhost:8808/api/health || echo "❌ Health check failed"

echo ""
echo "📋 Testing Indian Stock Endpoint..."
curl -f http://localhost:8808/api/stocks/in/top || echo "❌ Indian stocks endpoint failed"

echo ""
echo "📋 Testing Individual Stock Endpoint..."
curl -f http://localhost:8808/api/stocks/in/HDFC || echo "❌ Individual stock endpoint failed"

echo ""
echo "📋 Testing Buy Endpoint (should show 401 without auth)..."
curl -f -X POST http://localhost:8808/api/stocks/in/trade/buy \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","quantity":10,"entryPrice":3650.25,"timeFrame":"Intraday","marginUsed":1000,"charges":50}' \
  || echo "❌ Buy endpoint failed"

echo ""
echo "🔍 Debug Complete!"
echo "Check the logs above for specific errors"
