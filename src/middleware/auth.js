import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  console.log(`[Auth] Path: ${req.path}, Method: ${req.method}, Has Token: ${!!token}`);

  if (!token) {
    console.log(`[Auth] 401 - Missing token for ${req.path}`);
    return res.status(401).json({ message: "Missing authorization token" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    console.log(`[Auth] Success - User: ${decoded.id}, Role: ${decoded.role}`);
    return next();
  } catch (err) {
    console.log(`[Auth] 401 - Invalid token for ${req.path}: ${err.message}`);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  console.log(`[Admin] Checking admin for User: ${req.user?.id}, Role: ${req.user?.role}`);
  
  if (req.user?.role !== "admin") {
    console.log(`[Admin] 403 - Admin access required for ${req.path}`);
    return res.status(403).json({ message: "Admin access required" });
  }

  console.log(`[Admin] Success - Admin access granted for ${req.path}`);
  return next();
}
