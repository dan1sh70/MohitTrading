import { sql } from "../../db/mysql.js";
import { PremiumAccessService } from "../premium/premium.service.js";

/**
 * Referral Business Logic Engine
 */
export class ReferralService {
  /**
   * Process and reward referral relationship safely and idempotently
   */
  static async processReferralRegistration(referrerId, referredId) {
    if (referrerId === referredId) {
      throw new Error("Self-referrals are prohibited");
    }

    // Check if referred user already has a referral record
    const existing = await sql(`SELECT id FROM referral_reward_transactions WHERE referred_id = $1`, [referredId]);
    if (existing.length > 0) {
      return { alreadyProcessed: true };
    }

    // Get active campaign
    const campRows = await sql(`SELECT * FROM referral_campaigns WHERE is_active = TRUE ORDER BY id DESC LIMIT 1`);
    const campaign = campRows[0] || {
      id: null,
      referrer_reward_type: "PRO_DAYS",
      referrer_reward_value: 7,
      referred_reward_type: "PRO_DAYS",
      referred_reward_value: 3
    };

    // Apply rewards
    // 1. Referrer reward
    if (campaign.referrer_reward_type === "PRO_DAYS") {
      await PremiumAccessService.extendSubscription(referrerId, campaign.referrer_reward_value, "REFERRAL_REWARD");
    } else if (campaign.referrer_reward_type === "DIAMONDS") {
      await sql(`UPDATE users SET diamonds = diamonds + $1 WHERE id = $2`, [campaign.referrer_reward_value, referrerId]);
    }

    // 2. Referred user reward
    if (campaign.referred_reward_type === "PRO_DAYS") {
      await PremiumAccessService.extendSubscription(referredId, campaign.referred_reward_value, "REFERRAL_REWARD");
    } else if (campaign.referred_reward_type === "DIAMONDS") {
      await sql(`UPDATE users SET diamonds = diamonds + $1 WHERE id = $2`, [campaign.referred_reward_value, referredId]);
    }

    // 3. Record transaction in referral_reward_transactions
    await sql(
      `INSERT INTO referral_reward_transactions 
       (referrer_id, referred_id, campaign_id, reward_type, referrer_reward_amount, referred_reward_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED')`,
      [referrerId, referredId, campaign.id, campaign.referrer_reward_type, campaign.referrer_reward_value, campaign.referred_reward_value]
    );

    // 4. Send notifications
    try {
      await sql(
        `INSERT INTO user_notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'REFERRAL_REWARD_GRANTED'), ($4, $5, $6, 'REFERRAL_WELCOME_BONUS')`,
        [
          referrerId,
          "Referral Reward Unlocked!",
          `A friend joined using your referral code! You received ${campaign.referrer_reward_value} ${campaign.referrer_reward_type}.`,
          referredId,
          "Welcome Gift!",
          `Thanks for joining via referral! You received ${campaign.referred_reward_value} ${campaign.referred_reward_type}.`
        ]
      );
    } catch (e) {}

    return {
      success: true,
      referrerReward: `${campaign.referrer_reward_value} ${campaign.referrer_reward_type}`,
      referredReward: `${campaign.referred_reward_value} ${campaign.referred_reward_type}`
    };
  }
}

/**
 * GET /api/v1/referral/overview
 */
export async function getReferralOverviewHandler(req, res) {
  try {
    const userId = req.user.id;
    const userRows = await sql(`SELECT referral_code, diamonds FROM users WHERE id = $1`, [userId]);
    const user = userRows[0] || {};

    const code = user.referral_code || `REF${userId}`;
    const link = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/register?ref=${code}`;

    const statsRows = await sql(
      `SELECT 
         COUNT(*) AS total_referrals,
         SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS successful_referrals,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_referrals,
         SUM(referrer_reward_amount) AS total_rewards_earned
       FROM referral_reward_transactions 
       WHERE referrer_id = $1`,
      [userId]
    );

    const stats = statsRows[0] || {};

    // Get active campaign rules
    const campRows = await sql(`SELECT * FROM referral_campaigns WHERE is_active = TRUE ORDER BY id DESC LIMIT 1`);
    const campaign = campRows[0] || {
      referrer_reward_value: 7,
      referrer_reward_type: "PRO_DAYS",
      referred_reward_value: 3,
      referred_reward_type: "PRO_DAYS"
    };

    return res.json({
      success: true,
      data: {
        referralCode: code,
        referralUrl: link,
        diamonds: user.diamonds || 0,
        currentCampaign: {
          referrerReward: `${campaign.referrer_reward_value} ${campaign.referrer_reward_type}`,
          refereeReward: `${campaign.referred_reward_value} ${campaign.referred_reward_type}`
        },
        statistics: {
          totalReferrals: Number(stats.total_referrals || 0),
          successfulReferrals: Number(stats.successful_referrals || 0),
          pendingReferrals: Number(stats.pending_referrals || 0),
          totalRewardsEarned: Number(stats.total_rewards_earned || 0)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/referral/code
 */
export async function getReferralCodeHandler(req, res) {
  try {
    const userId = req.user.id;
    const userRows = await sql(`SELECT referral_code FROM users WHERE id = $1`, [userId]);
    return res.json({
      success: true,
      data: { referralCode: userRows[0]?.referral_code || `REF${userId}` }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/referral/link
 */
export async function getReferralLinkHandler(req, res) {
  try {
    const userId = req.user.id;
    const userRows = await sql(`SELECT referral_code FROM users WHERE id = $1`, [userId]);
    const code = userRows[0]?.referral_code || `REF${userId}`;
    const link = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/register?ref=${code}`;
    return res.json({
      success: true,
      data: { referralCode: code, referralLink: link }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/referral/history
 */
export async function getReferralHistoryHandler(req, res) {
  try {
    const userId = req.user.id;
    const rows = await sql(
      `SELECT rrt.*, u.full_name AS referred_name, u.email AS referred_email
       FROM referral_reward_transactions rrt
       JOIN users u ON rrt.referred_id = u.id
       WHERE rrt.referrer_id = $1
       ORDER BY rrt.id DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        referredUserName: r.referred_name,
        referredUserEmail: r.referred_email,
        rewardType: r.reward_type,
        rewardAmount: r.referrer_reward_amount,
        status: r.status,
        date: r.created_at
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/referral/rewards
 */
export async function getReferralRewardsHandler(req, res) {
  try {
    const userId = req.user.id;
    const rows = await sql(
      `SELECT reward_type, SUM(referrer_reward_amount) AS total_amount, COUNT(*) AS count
       FROM referral_reward_transactions
       WHERE referrer_id = $1 AND status = 'APPROVED'
       GROUP BY reward_type`,
      [userId]
    );

    return res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/referral/statistics
 */
export async function getReferralStatisticsHandler(req, res) {
  try {
    const userId = req.user.id;
    const statsRows = await sql(
      `SELECT 
         COUNT(*) AS total_invites,
         SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS active_pro_members_invited,
         SUM(referrer_reward_amount) AS total_pro_days_earned
       FROM referral_reward_transactions
       WHERE referrer_id = $1`,
      [userId]
    );

    return res.json({
      success: true,
      data: statsRows[0] || {}
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
