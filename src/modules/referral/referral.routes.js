import { Router } from "express";
import { getReferralInfo } from "./referral.controller.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", getReferralInfo);

export const referralRouter = router;
