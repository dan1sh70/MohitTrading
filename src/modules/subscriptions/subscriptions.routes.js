import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  getSubscriptionPlansHandler,
  getSubscriptionPlanByIdHandler,
  checkoutSubscriptionHandler,
  verifyPaymentHandler,
  getCurrentSubscriptionHandler,
  getSubscriptionHistoryHandler,
  cancelSubscriptionHandler,
  renewSubscriptionHandler,
  getPaymentHistoryHandler
} from "./subscriptions.controller.js";

export const subscriptionsRouter = Router();

// Public plans browsing
subscriptionsRouter.get("/plans", getSubscriptionPlansHandler);
subscriptionsRouter.get("/plans/:id", getSubscriptionPlanByIdHandler);

// Authenticated subscription endpoints
subscriptionsRouter.post("/checkout", requireAuth, checkoutSubscriptionHandler);
subscriptionsRouter.post("/verify-payment", requireAuth, verifyPaymentHandler);
subscriptionsRouter.get("/current", requireAuth, getCurrentSubscriptionHandler);
subscriptionsRouter.get("/history", requireAuth, getSubscriptionHistoryHandler);
subscriptionsRouter.post("/cancel", requireAuth, cancelSubscriptionHandler);
subscriptionsRouter.post("/renew", requireAuth, renewSubscriptionHandler);
subscriptionsRouter.get("/payment-history", requireAuth, getPaymentHistoryHandler);

export default subscriptionsRouter;

