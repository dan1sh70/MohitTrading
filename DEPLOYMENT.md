# Render Deployment Guide

## Prerequisites

- Render.com account
- GitHub repository with this code
- MySQL database URL (or separate MySQL instance)
- Redis database URL (or Redis instance)

## Environment Variables Required

Before deploying to Render, ensure these environment variables are set in your Render dashboard:

### Required Variables

- **DATABASE_URL** - MySQL connection string in format: `mysql://user:password@host:port/database`
- **REDIS_URL** - Redis connection string
- **JWT_SECRET** - Secret key for JWT signing (generate a strong random string)

### Recommended Variables

- **NODE_ENV** - Set to `production`
- **PORT** - Automatically set by Render (10000), but can be customized
- **CLIENT_ORIGIN** - Frontend URL for CORS (e.g., `https://your-app.com`)
- **ENABLE_CRYPTO_POLLING** - Set to `true` to enable crypto polling service

### Optional Variables

- **ADMIN_EMAIL** - Admin email (default: `admin@papertrading.local`)
- **ADMIN_PASSWORD** - Admin password (default: `Admin123!`)
- **TRADER_PASSWORD** - Trader password (default: `Trader123!`)
- **JWT_EXPIRES_IN** - JWT token expiration (default: `1d`)

## Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Connect to Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Select your GitHub repository
4. Configure:
   - **Name**: paper-trading-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter (recommended for production)

### 3. Set Environment Variables

In Render Dashboard → Environment:

```
DATABASE_URL=mysql://user:password@host:port/database
REDIS_URL=redis://user:password@host:port
JWT_SECRET=your-secret-key-here
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend-domain.com
ENABLE_CRYPTO_POLLING=true
```

### 4. Deploy

Click "Create Web Service" - Render will automatically deploy from your GitHub push

## Database Setup

### Using Render's MySQL

1. Create a MySQL database on Render
2. Copy the connection string
3. Set `DATABASE_URL` environment variable

### Using External MySQL

Ensure your MySQL server allows connections from Render's IP addresses (or allow all if on free tier)

## Redis Setup

### Using Render's Redis

1. Create a Redis instance on Render
2. Copy the connection string
3. Set `REDIS_URL` environment variable

### Using External Redis

Ensure your Redis server is accessible from Render

## Monitoring

After deployment:

- Check Render Logs: Dashboard → paper-trading-backend → Logs
- Verify database connection: `SELECT 1` query in logs
- Monitor for errors in real-time

## Database Initialization

If deploying for the first time and database doesn't exist:

1. SSH into Render service
2. Run: `npm run db:init`

Or manually run the schema.sql file on your MySQL database before deployment.

## Health Check

API is ready when you see in logs:

```
Paper Trading backend running on http://localhost:10000
```

You can test the health with:

```bash
curl https://your-service.render.com/
```

## Troubleshooting

### "Redis unavailable" warning

- This is OK for free tier. Set `ENABLE_CRYPTO_POLLING=false` if issues persist
- Redis is optional for basic operations

### "Cannot connect to database"

- Verify `DATABASE_URL` format
- Check database firewall allows Render IP
- Ensure database exists and schema is initialized

### Port issues

- Render automatically assigns PORT=10000
- Do not hardcode port; always use `process.env.PORT`
- This is already configured correctly in your code

## Production Recommendations

1. Use paid plans for better uptime
2. Enable auto-deploy on GitHub pushes
3. Set up monitoring/alerting
4. Use strong JWT_SECRET (minimum 32 characters)
5. Regularly update dependencies: `npm update`
6. Consider CDN for static assets
7. Enable HTTPS (Render handles this automatically)

## Useful Links

- [Render Docs](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [Environment Variables on Render](https://render.com/docs/environment-variables)
