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
      SELECT 
        u.id, 
        u.full_name AS name,
        ac.primary_asset_class AS assetClass,
        ROUND(up.return_on_capital, 1) AS returnOnCapital
      FROM (
        SELECT 
          t.user_id,
          (SUM(t.net_pnl) / NULLIF(SUM(t.margin_used), 0)) * 100 AS return_on_capital,
          SUM(t.margin_used) AS total_margin
        FROM unified_trades t
        WHERE 1=1 ${timeFilter}
        GROUP BY t.user_id
      ) up
      JOIN users u ON up.user_id = u.id
      JOIN (
        SELECT user_id,
               SUBSTRING_INDEX(GROUP_CONCAT(asset_class ORDER BY trade_count DESC), ',', 1) AS primary_asset_class
        FROM (
          SELECT user_id, asset_class, COUNT(*) as trade_count
          FROM unified_trades t
          WHERE 1=1 ${timeFilter}
          GROUP BY user_id, asset_class
        ) grouped
        GROUP BY user_id
      ) ac ON up.user_id = ac.user_id
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
