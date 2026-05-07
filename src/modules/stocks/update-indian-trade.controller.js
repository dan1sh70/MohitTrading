import { sql } from "../database/index.js";
import { writeAuditLog } from "../audit/audit.service.js";

// ═════════════════════════════════════════════════════════════════
// UPDATE INDIAN STOCK TRADE
// ═══════════════════════════════════════════════════════════════════

export async function updateIndianStock(req, res) {
  console.log(`[UpdateTrade] Update request received - User: ${req.user?.id}`);
  console.log(`[UpdateTrade] Request body:`, JSON.stringify(req.validatedBody));

  const { positionId, quantity, entryPrice, timeFrame } = req.validatedBody;
  const userId = req.user?.id;

  if (!userId) {
    console.log(`[UpdateTrade] 401 - No userId in request`);
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!positionId || !quantity || !entryPrice || !timeFrame) {
    console.log(`[UpdateTrade] 400 - Missing required fields`);
    return res.status(400).json({ 
      message: "Missing required fields: positionId, quantity, entryPrice, timeFrame" 
    });
  }

  try {
    // Update the position in indian_stock_positions table
    console.log(`[UpdateTrade] Updating position ${positionId} for user ${userId}`);
    
    const updateResult = await sql(
      `UPDATE indian_stock_positions 
       SET quantity = $1, entry_price = $2, time_frame = $3, last_update = NOW()
       WHERE id = $4 AND user_id = $5`,
      [quantity, entryPrice, timeFrame, positionId, userId]
    );

    if (updateResult.rowCount === 0) {
      console.log(`[UpdateTrade] 404 - Position not found`);
      return res.status(404).json({ message: "Position not found" });
    }

    console.log(`[UpdateTrade] Position updated successfully`);

    // Also update the corresponding trade record if it exists
    await sql(
      `UPDATE trades 
       SET quantity = $1, price = $2
       WHERE user_id = $3 AND symbol = (SELECT symbol FROM indian_stock_positions WHERE id = $4) AND status = 'OPEN'`,
      [quantity, entryPrice, userId, positionId]
    );

    // Write audit log
    await writeAuditLog({
      actorUserId: userId,
      action: 'INDIAN_STOCK_UPDATE',
      targetType: 'position',
      targetId: String(positionId),
      details: { positionId, quantity, entryPrice, timeFrame }
    });

    console.log(`[UpdateTrade] Audit log written`);

    return res.status(200).json({
      message: "Trade updated successfully",
      positionId,
      quantity,
      entryPrice,
      timeFrame
    });

  } catch (error) {
    console.error(`[UpdateTrade] ERROR - Full stack:`, error);
    console.error(`[UpdateTrade] Error message: ${error.message}`);
    console.error(`[UpdateTrade] Error code: ${error.code}`);
    console.error(`[UpdateTrade] Error SQL: ${error.sql}`);
    return res.status(500).json({ 
      message: "Failed to update trade", 
      error: error.message,
      code: error.code
    });
  }
}
