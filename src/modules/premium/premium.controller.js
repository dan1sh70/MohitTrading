import { PremiumAccessService } from "./premium.service.js";
import { sql } from "../../db/mysql.js";

/**
 * GET /api/v1/premium/status
 */
export async function getPremiumStatusHandler(req, res) {
  try {
    const userId = req.user.id;
    const state = await PremiumAccessService.getUserSubscriptionState(userId);
    return res.json({
      success: true,
      data: state
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/premium/entitlements
 */
export async function getPremiumEntitlementsHandler(req, res) {
  try {
    const userId = req.user.id;
    const state = await PremiumAccessService.getUserSubscriptionState(userId);
    const allFeatures = await sql(`SELECT * FROM feature_entitlements`);

    const entitlements = allFeatures.map(f => ({
      featureKey: f.feature_key,
      featureName: f.feature_name,
      description: f.description,
      isIncluded: state.isAdmin || state.entitlements.includes(f.feature_key)
    }));

    return res.json({
      success: true,
      data: {
        isPremium: state.isPremium,
        status: state.status,
        plan: state.plan,
        entitlements
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/premium/features
 */
export async function getPremiumFeaturesHandler(req, res) {
  try {
    const features = await sql(`SELECT * FROM feature_entitlements`);
    return res.json({
      success: true,
      data: features
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/premium/usage
 */
export async function getPremiumUsageHandler(req, res) {
  try {
    const userId = req.user.id;
    const state = await PremiumAccessService.getUserSubscriptionState(userId);

    return res.json({
      success: true,
      data: {
        userId,
        status: state.status,
        daysRemaining: state.daysRemaining || 0,
        quotaUsed: "Unlimited Pro Tier",
        activeFeatures: state.entitlements || []
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/premium/history
 */
export async function getPremiumHistoryHandler(req, res) {
  try {
    const userId = req.user.id;
    const extensions = await sql(
      `SELECT * FROM subscription_extensions WHERE user_id = $1 ORDER BY id DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: extensions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
