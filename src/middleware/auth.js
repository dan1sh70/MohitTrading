import { verifyToken } from "../utils/jwt.js";

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/health',
  '/api/commodities',
  '/api/crypto/prices',
  '/api/crypto/top-3/famous',
  '/api/crypto/trending/top-10',
  '/api/crypto/trending/all',
  '/api/crypto/top-10/ranked',
  '/api/crypto/all/stats',
  '/api/stocks/us',
  '/api/forex/pairs',
  '/api/forex/pairs/tested',
  '/api/forex/pairs/upcoming',
  '/api/stocks/in',
  '/api/stocks/in/batch',
  '/api/news/latest',
  '/api/news/search',
  '/api/news/symbols',
  '/api/news/trending',
  '/api/news/date-range',
  '/api/news/crypto',
  '/api/news/stocks',
  '/api/news/advanced'
];

export function requireAuth(req, res, next) {
  // Check if this is a public endpoint
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
    req.path.startsWith(endpoint) || req.path === endpoint.replace('/api', '')
  );

  if (isPublicEndpoint) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
}
