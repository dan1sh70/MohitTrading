import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  getPremiumStatusHandler,
  getPremiumEntitlementsHandler,
  getPremiumFeaturesHandler,
  getPremiumUsageHandler,
  getPremiumHistoryHandler
} from "./premium.controller.js";

export const premiumRouter = Router();

// Public / Authenticated features listing
premiumRouter.get("/features", getPremiumFeaturesHandler);

// Authenticated user status and entitlements
premiumRouter.get("/status", requireAuth, getPremiumStatusHandler);
premiumRouter.get("/entitlements", requireAuth, getPremiumEntitlementsHandler);
premiumRouter.get("/usage", requireAuth, getPremiumUsageHandler);
premiumRouter.get("/history", requireAuth, getPremiumHistoryHandler);

export default premiumRouter;

