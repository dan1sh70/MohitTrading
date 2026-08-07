import { sql } from "../../db/mysql.js";

/**
 * Get the global leaderboard for crypto performance
 */
export async function getLeaderboard(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Fetch the top users ranked by consistency score or profit factor
    const leaderboardResult = await sql(`
      SELECT 
        u.id, 
        u.full_name as name, 
        cp.overall_grade as grade,
        cp.consistency_score,
        cp.risk_meter,
        cp.portfolio_health,
        cp.win_rate,
        cp.total_realised_pnl as pnl,
        cp.total_trades as trades
      FROM crypto_performance cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.total_trades >= 3
      ORDER BY cp.consistency_score DESC, cp.total_realised_pnl DESC
      LIMIT $1
    `, [limit]);

    return res.json({
      success: true,
      data: leaderboardResult.rows || leaderboardResult
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard"
    });
  }
}
