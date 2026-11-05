import { sql } from "../../db/mysql.js";

/**
 * Premium Access & Entitlement Service
 * Centralized entitlement validation as required by Section 5
 */
export class PremiumAccessService {
  /**
   * Determine exact user subscription state and validity
   * States: Free User, Premium Active, Premium Expired, Premium Suspended, Premium Pending Activation
   */
  static async getUserSubscriptionState(userId) {
    // 1. Check if user is admin - Admins have full access
    const userRows = await sql(`SELECT id, role, full_name, email FROM users WHERE id = $1`, [userId]);
    if (!userRows.length) {
      return {
        status: "NOT_FOUND",
        isPremium: false,
        plan: null,
        entitlements: []
      };
    }

    const user = userRows[0];
    if (user.role === "admin") {
      return {
        status: "PREMIUM_ACTIVE",
        isPremium: true,
        isAdmin: true,
        plan: {
          id: 0,
          planCode: "ADMIN_OVERRIDE",
          name: "Administrator Full Access"
        },
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 86400 * 1000).toISOString(),
        daysRemaining: 365,
        entitlements: ["option_chain", "gainers_losers", "fii_dii", "global_indices", "market_heatmap"]
      };
    }

    // 2. Query user_subscriptions for active/suspended/pending records
    const subRows = await sql(
      `SELECT us.*, sp.plan_code, sp.name AS plan_name, sp.price, sp.duration_days
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1
       ORDER BY us.id DESC
       LIMIT 1`,
      [userId]
    );

    if (!subRows.length) {
      return {
        status: "FREE_USER",
        isPremium: false,
        plan: { planCode: "FREE", name: "Free Plan" },
        startDate: null,
        endDate: null,
        daysRemaining: 0,
        entitlements: []
      };
    }

    const sub = subRows[0];
    const now = Date.now();
    const endMs = sub.end_date ? new Date(sub.end_date).getTime() : 0;

    // Check expiry
    if (sub.status === "ACTIVE" && endMs < now) {
      // Auto-update to EXPIRED in database
      await sql(`UPDATE user_subscriptions SET status = 'EXPIRED' WHERE id = $1`, [sub.id]);
      return {
        status: "PREMIUM_EXPIRED",
        isPremium: false,
        plan: { planCode: sub.plan_code, name: sub.plan_name },
        startDate: sub.start_date,
        endDate: sub.end_date,
        daysRemaining: 0,
        entitlements: []
      };
    }

    if (sub.status === "SUSPENDED") {
      return {
        status: "PREMIUM_SUSPENDED",
        isPremium: false,
        plan: { planCode: sub.plan_code, name: sub.plan_name },
        startDate: sub.start_date,
        endDate: sub.end_date,
        daysRemaining: 0,
        entitlements: []
      };
    }

    if (sub.status === "PENDING") {
      return {
        status: "PREMIUM_PENDING_ACTIVATION",
        isPremium: false,
        plan: { planCode: sub.plan_code, name: sub.plan_name },
        startDate: null,
        endDate: null,
        daysRemaining: 0,
        entitlements: []
      };
    }

    if (sub.status === "ACTIVE" && endMs >= now) {
      // Fetch plan features
      const features = await sql(
        `SELECT feature_key FROM subscription_plan_features WHERE plan_id = $1 AND is_included = TRUE`,
        [sub.plan_id]
      );
      const daysRemaining = Math.max(0, Math.ceil((endMs - now) / (86400 * 1000)));

      return {
        status: "PREMIUM_ACTIVE",
        isPremium: true,
        subscriptionId: sub.id,
        plan: {
          id: sub.plan_id,
          planCode: sub.plan_code,
          name: sub.plan_name,
          price: Number(sub.price)
        },
        startDate: sub.start_date,
        endDate: sub.end_date,
        daysRemaining,
        entitlements: features.map(f => f.feature_key)
      };
    }

    return {
      status: "FREE_USER",
      isPremium: false,
      plan: { planCode: "FREE", name: "Free Plan" },
      startDate: null,
      endDate: null,
      daysRemaining: 0,
      entitlements: []
    };
  }

  /**
   * Validate whether a user has access to a specific premium feature
   */
  static async validateFeatureAccess(userId, featureKey) {
    const state = await this.getUserSubscriptionState(userId);
    if (!state.isPremium) {
      return {
        granted: false,
        reason: state.status,
        message: "This feature requires an active Pro subscription."
      };
    }

    if (state.isAdmin) {
      return { granted: true, state };
    }

    // Check specific feature entitlement
    if (!state.entitlements.includes(featureKey)) {
      return {
        granted: false,
        reason: "FEATURE_NOT_IN_PLAN",
        message: `Your current plan does not include '${featureKey}'.`
      };
    }

    return { granted: true, state };
  }

  /**
   * Extend a user's subscription by X days (Used for referrals, renewals, admin grants)
   */
  static async extendSubscription(userId, days, reasonType, adminId = null, adminReason = null) {
    if (days <= 0) return false;

    // Get latest subscription or fallback to Monthly Pro
    const subRows = await sql(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    let planId = 2; // Default Monthly Pro (ID 2)
    let previousEndDate = null;
    let newEndDate = null;
    let subscriptionId = null;

    if (subRows.length && subRows[0].status === "ACTIVE" && new Date(subRows[0].end_date).getTime() > Date.now()) {
      const existing = subRows[0];
      subscriptionId = existing.id;
      planId = existing.plan_id;
      previousEndDate = new Date(existing.end_date);
      newEndDate = new Date(previousEndDate.getTime() + days * 86400 * 1000);

      await sql(`UPDATE user_subscriptions SET end_date = $1 WHERE id = $2`, [newEndDate, subscriptionId]);
    } else {
      // Create new active subscription
      const startDate = new Date();
      previousEndDate = startDate;
      newEndDate = new Date(startDate.getTime() + days * 86400 * 1000);

      const res = await sql(
        `INSERT INTO user_subscriptions 
         (user_id, plan_id, status, start_date, end_date, granted_by_admin_id, admin_grant_reason)
         VALUES ($1, $2, 'ACTIVE', $3, $4, $5, $6)`,
        [userId, planId, startDate, newEndDate, adminId, adminReason]
      );
      subscriptionId = res.insertId;
    }

    // Record extension audit log
    await sql(
      `INSERT INTO subscription_extensions 
       (user_id, subscription_id, extension_days, reason_type, previous_end_date, new_end_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, subscriptionId, days, reasonType, previousEndDate, newEndDate]
    );

    // Send in-app notification
    try {
      await sql(
        `INSERT INTO user_notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'PRO_EXTENDED')`,
        [userId, "Pro Subscription Extended!", `Your Pro subscription has been extended by ${days} days (${reasonType}). Enjoy Pro Zone features!`]
      );
    } catch (e) {}

    return { subscriptionId, days, newEndDate };
  }
}
