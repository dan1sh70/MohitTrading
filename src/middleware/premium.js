import { PremiumAccessService } from "../modules/premium/premium.service.js";

/**
 * Middleware factory to protect premium Pro Zone features.
 * Validates backend entitlement and rejects unauthorized or expired users.
 *
 * @param {string} [featureKey] - Optional specific feature key e.g. 'option_chain'
 */
export function requirePremium(featureKey = null) {
  return async (req, res, next) => {
    try {
      // Must have passed requireAuth first
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          code: "AUTHENTICATION_REQUIRED",
          message: "You must be logged in to access Pro Zone features."
        });
      }

      const userId = req.user.id;

      if (featureKey) {
        const validation = await PremiumAccessService.validateFeatureAccess(userId, featureKey);
        if (!validation.granted) {
          return res.status(403).json({
            success: false,
            code: "PREMIUM_REQUIRED",
            message: validation.message,
            data: {
              feature: featureKey,
              subscription_required: true,
              reason: validation.reason
            }
          });
        }
        req.subscriptionState = validation.state;
      } else {
        const state = await PremiumAccessService.getUserSubscriptionState(userId);
        if (!state.isPremium) {
          return res.status(403).json({
            success: false,
            code: "PREMIUM_REQUIRED",
            message: "This feature requires an active Pro subscription.",
            data: {
              subscription_required: true,
              status: state.status
            }
          });
        }
        req.subscriptionState = state;
      }

      return next();
    } catch (err) {
      console.error("[requirePremium Middleware Error]:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to verify premium entitlement",
        error: err.message
      });
    }
  };
}
