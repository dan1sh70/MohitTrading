import { sql } from "../../db/mysql.js";

/**
 * Get the global leaderboard for crypto performance
 */
export async function getLeaderboard(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const timeframe = req.query.timeframe || 'monthly'; // 'weekly' or 'monthly'

    let timeFilter = '';
    if (timeframe === 'weekly') {
      timeFilter = "AND t.exit_time >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)";
    } else {
      timeFilter = "AND t.exit_time >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)";
    }

    // Step 1: Calculate total net PnL and total margin used for each user in the timeframe
    // Step 2: Determine their primary asset class by counting trades
    const leaderboardQuery = `
      WITH UserPerformance AS (
        SELECT 
          t.user_id,
          SUM(t.net_pnl) AS total_pnl,
          SUM(t.margin_used) AS total_margin,
          (SUM(t.net_pnl) / NULLIF(SUM(t.margin_used), 0)) * 100 AS return_on_capital
        FROM unified_trades t
        WHERE 1=1 ${timeFilter}
        GROUP BY t.user_id
      ),
      AssetClassCounts AS (
        SELECT 
          t.user_id,
          t.asset_class,
          COUNT(*) as trade_count,
          ROW_NUMBER() OVER(PARTITION BY t.user_id ORDER BY COUNT(*) DESC) as rn
        FROM unified_trades t
        WHERE 1=1 ${timeFilter}
        GROUP BY t.user_id, t.asset_class
      )
      SELECT 
        u.id, 
        u.full_name AS name,
        ac.asset_class AS assetClass,
        ROUND(up.return_on_capital, 1) AS returnOnCapital
      FROM UserPerformance up
      JOIN users u ON up.user_id = u.id
      JOIN AssetClassCounts ac ON up.user_id = ac.user_id AND ac.rn = 1
      WHERE up.total_margin > 0
      ORDER BY up.return_on_capital DESC
      LIMIT $1
    `;

    const leaderboardResult = await sql(leaderboardQuery, [limit]);

    // Format the response to match the UI (add rank)
    const formattedData = leaderboardResult.rows.map((row, index) => {
      // Map database enum to friendly UI names
      let uiAssetClass = "Crypto";
      if (row.assetClass === 'INDIAN_STOCK') uiAssetClass = "NSE";
      else if (row.assetClass === 'US_STOCK') uiAssetClass = "US Stocks";
      else if (row.assetClass === 'FOREX') uiAssetClass = "Forex";
      else if (row.assetClass === 'COMMODITY') uiAssetClass = "Commodities";
      else if (row.assetClass === 'CRYPTO') uiAssetClass = "Crypto";

      return {
        rank: index + 1,
        name: row.name,
        assetClass: uiAssetClass,
        returnOnCapital: row.returnOnCapital
      };
    });

    return res.json({
      success: true,
      timeframe,
      data: formattedData
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard"
    });
  }
}
