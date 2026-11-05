import { sql } from "../../db/mysql.js";
import { PremiumAccessService } from "../premium/premium.service.js";
import { PaymentGatewayService } from "../subscriptions/payment-gateway.service.js";

// ═════════════════════════════════════════════════════════════════════════════
// 1. SUBSCRIPTION PLANS & FEATURES ADMINISTRATION
// ═════════════════════════════════════════════════════════════════════════════

export async function createSubscriptionPlan(req, res) {
  try {
    const { planCode, name, description, price, currency = "INR", durationDays, isPopular = false, features = [] } = req.body;
    if (!planCode || !name || price === undefined || durationDays === undefined) {
      return res.status(400).json({ success: false, message: "planCode, name, price, and durationDays are required" });
    }

    const result = await sql(
      `INSERT INTO subscription_plans 
       (plan_code, name, description, price, currency, duration_days, is_active, is_popular)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
      [planCode.toUpperCase(), name, description, price, currency, durationDays, isPopular]
    );

    const planId = result.insertId;

    if (Array.isArray(features)) {
      for (const feat of features) {
        await sql(
          `INSERT INTO subscription_plan_features (plan_id, feature_key, is_included)
           VALUES ($1, $2, TRUE) ON DUPLICATE KEY UPDATE is_included = TRUE`,
          [planId, feat]
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      data: { id: planId, planCode, name, price, durationDays }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, durationDays, isActive, isPopular, features } = req.body;

    await sql(
      `UPDATE subscription_plans 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           duration_days = COALESCE($4, duration_days),
           is_active = COALESCE($5, is_active),
           is_popular = COALESCE($6, is_popular),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [name, description, price, durationDays, isActive, isPopular, id]
    );

    if (Array.isArray(features)) {
      await sql(`DELETE FROM subscription_plan_features WHERE plan_id = $1`, [id]);
      for (const feat of features) {
        await sql(
          `INSERT INTO subscription_plan_features (plan_id, feature_key, is_included)
           VALUES ($1, $2, TRUE)`,
          [id, feat]
        );
      }
    }

    return res.json({ success: true, message: "Subscription plan updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. PREMIUM USER DASHBOARD & ACTIONS
// ═════════════════════════════════════════════════════════════════════════════

export async function getPremiumAdminDashboard(req, res) {
  try {
    // Aggregates for Admin Dashboard
    const totalUsersRows = await sql(`SELECT COUNT(*) AS total FROM users`);
    const activeProRows = await sql(`SELECT COUNT(DISTINCT user_id) AS active_pro FROM user_subscriptions WHERE status = 'ACTIVE' AND end_date > CURRENT_TIMESTAMP`);
    const expiredProRows = await sql(`SELECT COUNT(DISTINCT user_id) AS expired_pro FROM user_subscriptions WHERE status = 'EXPIRED' OR (status = 'ACTIVE' AND end_date <= CURRENT_TIMESTAMP)`);
    const revenueRows = await sql(`SELECT SUM(amount) AS total_revenue FROM subscription_transactions WHERE status = 'SUCCESS'`);

    // Plan breakdown
    const planBreakdown = await sql(
      `SELECT sp.name AS plan_name, COUNT(us.id) AS subscriber_count 
       FROM user_subscriptions us 
       JOIN subscription_plans sp ON us.plan_id = sp.id 
       WHERE us.status = 'ACTIVE' AND us.end_date > CURRENT_TIMESTAMP 
       GROUP BY sp.name`
    );

    // Recent 10 subscriptions
    const recentSubscriptions = await sql(
      `SELECT us.*, u.full_name, u.email, sp.name AS plan_name 
       FROM user_subscriptions us 
       JOIN users u ON us.user_id = u.id 
       JOIN subscription_plans sp ON us.plan_id = sp.id 
       ORDER BY us.id DESC LIMIT 10`
    );

    return res.json({
      success: true,
      data: {
        totalUsers: Number(totalUsersRows[0]?.total || 0),
        activeProUsers: Number(activeProRows[0]?.active_pro || 0),
        expiredProUsers: Number(expiredProRows[0]?.expired_pro || 0),
        totalRevenue: Number(revenueRows[0]?.total_revenue || 0),
        planBreakdown,
        recentSubscriptions
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function grantComplimentaryProAccess(req, res) {
  try {
    const adminId = req.user.id;
    const { userId, days = 30, reason = "Admin complimentary grant" } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "userId is required" });

    const result = await PremiumAccessService.extendSubscription(userId, parseInt(days, 10), "ADMIN_GRANT", adminId, reason);

    return res.json({
      success: true,
      message: `Granted ${days} days of complimentary Pro access to user ${userId}`,
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function suspendUserProAccess(req, res) {
  try {
    const { userId } = req.params;
    const { reason = "Administrative suspension" } = req.body;

    await sql(
      `UPDATE user_subscriptions 
       SET status = 'SUSPENDED', cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2 AND status = 'ACTIVE'`,
      [reason, userId]
    );

    return res.json({ success: true, message: `Suspended Pro access for user ${userId}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function processAdminRefund(req, res) {
  try {
    const adminId = req.user.id;
    const { transactionId, reason } = req.body;
    if (!transactionId || !reason) {
      return res.status(400).json({ success: false, message: "transactionId and reason are required" });
    }

    const refund = await PaymentGatewayService.processRefund(transactionId, adminId, reason);
    return res.json({
      success: true,
      message: "Refund processed successfully and Pro access revoked",
      data: refund
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. REFERRAL CAMPAIGNS ADMINISTRATION
// ═════════════════════════════════════════════════════════════════════════════

export async function getReferralCampaigns(req, res) {
  try {
    const campaigns = await sql(`SELECT * FROM referral_campaigns ORDER BY id DESC`);
    return res.json({ success: true, data: campaigns });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createReferralCampaign(req, res) {
  try {
    const { campaignName, referrerRewardType = "PRO_DAYS", referrerRewardValue = 7, referredRewardType = "PRO_DAYS", referredRewardValue = 3, eligibilityCondition = "REGISTRATION", isActive = true } = req.body;
    if (!campaignName) return res.status(400).json({ success: false, message: "campaignName is required" });

    // If activating new campaign, deactivate others if needed
    if (isActive) {
      await sql(`UPDATE referral_campaigns SET is_active = FALSE`);
    }

    const resDb = await sql(
      `INSERT INTO referral_campaigns 
       (campaign_name, is_active, referrer_reward_type, referrer_reward_value, referred_reward_type, referred_reward_value, eligibility_condition)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [campaignName, isActive, referrerRewardType, referrerRewardValue, referredRewardType, referredRewardValue, eligibilityCondition]
    );

    return res.status(201).json({
      success: true,
      message: "Referral campaign created",
      data: { id: resDb.insertId, campaignName }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateReferralCampaign(req, res) {
  try {
    const { id } = req.params;
    const { campaignName, referrerRewardValue, referredRewardValue, isActive } = req.body;

    if (isActive) {
      await sql(`UPDATE referral_campaigns SET is_active = FALSE WHERE id != $1`, [id]);
    }

    await sql(
      `UPDATE referral_campaigns 
       SET campaign_name = COALESCE($1, campaign_name),
           referrer_reward_value = COALESCE($2, referrer_reward_value),
           referred_reward_value = COALESCE($3, referred_reward_value),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [campaignName, referrerRewardValue, referredRewardValue, isActive, id]
    );

    return res.json({ success: true, message: "Referral campaign updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAllReferralTransactions(req, res) {
  try {
    const rows = await sql(
      `SELECT rrt.*, u1.full_name AS referrer_name, u1.email AS referrer_email,
              u2.full_name AS referred_name, u2.email AS referred_email
       FROM referral_reward_transactions rrt
       JOIN users u1 ON rrt.referrer_id = u1.id
       JOIN users u2 ON rrt.referred_id = u2.id
       ORDER BY rrt.id DESC LIMIT 100`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
