import dotenv from "dotenv";

dotenv.config();

const required = ["REDIS_URL", "JWT_SECRET"];

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasSimpleDbConfig = Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);

if (!hasDatabaseUrl && !hasSimpleDbConfig) {
  throw new Error(
    "Missing database configuration. Set DATABASE_URL or DB_HOST + DB_USER + DB_NAME."
  );
}

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const dbHost = process.env.DB_HOST ?? "localhost";
const dbPort = Number(process.env.DB_PORT ?? 3306);
const dbUser = process.env.DB_USER ?? "root";
const dbPassword = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME ?? "paper_trading";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8808),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  dbHost,
  dbPort,
  dbUser,
  dbPassword,
  dbName,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@papertrading.local",
  adminPassword: process.env.ADMIN_PASSWORD ?? "Admin123!",
  traderPassword: process.env.TRADER_PASSWORD ?? "Trader123!",
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY ?? "demo",
  upstoxApiKey: process.env.UPSTOX_API_KEY ?? "2fc81491-6fbd-43bb-8b15-955d8e0a727f",
  upstoxApiSecret: process.env.UPSTOX_API_SECRET ?? "kklm46v5r9",
  upstoxRedirectUri: process.env.UPSTOX_REDIRECT_URI ?? "http://localhost:8808/api/auth/upstox/callback",
  marketauxApiKey: process.env.MARKETAUX_API_KEY ?? "demo"
};
