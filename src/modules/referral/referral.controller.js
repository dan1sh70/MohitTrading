import { sql } from "../../db/mysql.js";

/**
 * GET /api/referrals
 * Get the current user's referral code, diamond balance, and referral history
 */
export async function getReferralInfo(req, res) {
  try {
    const userId = req.user.id;

    // Get user's referral code and diamonds
    const userResult = await sql(
      `SELECT referral_code, diamonds FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { referral_code: referralCode, diamonds } = userResult.rows[0];

    // Get the list of users they referred
    const referralsResult = await sql(
      `SELECT r.id, r.reward_diamonds, r.created_at, u.full_name, u.email
       FROM referrals r
       JOIN users u ON r.referred_id = u.id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: {
        referralCode,
        diamonds,
        totalReferrals: referralsResult.rows.length,
        referrals: referralsResult.rows.map(r => ({
          id: r.id,
          name: r.full_name,
          email: r.email,
          rewardDiamonds: r.reward_diamonds,
          createdAt: r.created_at
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching referral info:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
