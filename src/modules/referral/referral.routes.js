import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  getReferralOverviewHandler,
  getReferralCodeHandler,
  getReferralLinkHandler,
  getReferralHistoryHandler,
  getReferralRewardsHandler,
  getReferralStatisticsHandler
} from "./referral.service.js";
import { getReferralInfo } from "./referral.controller.js";

export const referralRouter = Router();

// Legacy backward-compatible endpoint
referralRouter.get("/", requireAuth, getReferralInfo);

// New standard endpoints as per master prompt
referralRouter.get("/overview", requireAuth, getReferralOverviewHandler);
referralRouter.get("/code", requireAuth, getReferralCodeHandler);
referralRouter.get("/link", requireAuth, getReferralLinkHandler);
referralRouter.get("/history", requireAuth, getReferralHistoryHandler);
referralRouter.get("/rewards", requireAuth, getReferralRewardsHandler);
referralRouter.get("/statistics", requireAuth, getReferralStatisticsHandler);

export default referralRouter;
