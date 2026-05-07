import { sql } from "../../db/index.js";
import { writeAuditLog } from "../../modules/audit/audit.service.js";

// ═══════════════════════════════════════════════════════════════════════════
// MARKET HOURS CONTROLLER
// Admin-controlled Indian stock market opening/closing times
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/market-hours
 * Get current market hours for all markets
 */
export async function getMarketHours(req, res) {
  try {
    const result = await sql(`
      SELECT id, market_type, market_name, 
             DATE_FORMAT(open_time, '%H:%i:%s') as open_time,
             DATE_FORMAT(close_time, '%H:%i:%s') as close_time,
             timezone, is_active, created_at, updated_at, notes
      FROM market_hours
      ORDER BY market_type
    `);

    return res.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('[MarketHours] Error fetching market hours:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch market hours',
      error: error.message
    });
  }
}

/**
 * GET /api/admin/market-hours/:marketType
 * Get market hours for specific market type (e.g., 'indian_stock')
 */
export async function getMarketHoursByType(req, res) {
  const { marketType } = req.params;

  try {
    const result = await sql(`
      SELECT id, market_type, market_name, 
             DATE_FORMAT(open_time, '%H:%i:%s') as open_time,
             DATE_FORMAT(close_time, '%H:%i:%s') as close_time,
             timezone, is_active, created_at, updated_at, notes
      FROM market_hours
      WHERE market_type = ?
    `, [marketType]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Market hours not found for type: ${marketType}`
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('[MarketHours] Error fetching market hours:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch market hours',
      error: error.message
    });
  }
}

/**
 * PUT /api/admin/market-hours/:id
 * Update market hours (Admin only)
 */
export async function updateMarketHours(req, res) {
  const { id } = req.params;
  const { open_time, close_time, is_active, notes, reason } = req.validatedBody;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  try {
    // Get current values for audit
    const currentResult = await sql(`
      SELECT open_time, close_time, is_active 
      FROM market_hours WHERE id = ?
    `, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Market hours record not found'
      });
    }

    const current = currentResult.rows[0];

    // Update market hours
    const updateResult = await sql(`
      UPDATE market_hours 
      SET open_time = ?, 
          close_time = ?, 
          is_active = ?,
          notes = ?,
          updated_by = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [open_time, close_time, is_active, notes || null, adminId, id]);

    if (updateResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes made'
      });
    }

    // Log to audit table
    await sql(`
      INSERT INTO market_hours_audit 
      (market_hours_id, action, old_open_time, new_open_time, old_close_time, new_close_time, changed_by, reason)
      VALUES (?, 'UPDATE', ?, ?, ?, ?, ?, ?)
    `, [id, current.open_time, open_time, current.close_time, close_time, adminId, reason || 'Admin update']);

    // Write audit log
    await writeAuditLog({
      actorUserId: adminId,
      action: 'MARKET_HOURS_UPDATE',
      targetType: 'market_hours',
      targetId: String(id),
      details: { 
        old_open_time: current.open_time, 
        new_open_time: open_time,
        old_close_time: current.close_time,
        new_close_time: close_time,
        is_active,
        reason
      }
    });

    // Get updated record
    const updatedResult = await sql(`
      SELECT id, market_type, market_name, 
             DATE_FORMAT(open_time, '%H:%i:%s') as open_time,
             DATE_FORMAT(close_time, '%H:%i:%s') as close_time,
             timezone, is_active, notes
      FROM market_hours
      WHERE id = ?
    `, [id]);

    return res.json({
      success: true,
      message: 'Market hours updated successfully',
      data: updatedResult.rows[0]
    });

  } catch (error) {
    console.error('[MarketHours] Error updating market hours:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update market hours',
      error: error.message
    });
  }
}

/**
 * GET /api/market-hours/status/:marketType
 * Check if market is currently open (Public endpoint)
 */
export async function checkMarketStatus(req, res) {
  const { marketType } = req.params;

  try {
    const result = await sql(`
      SELECT market_type, market_name, 
             DATE_FORMAT(open_time, '%H:%i:%s') as open_time,
             DATE_FORMAT(close_time, '%H:%i:%s') as close_time,
             timezone, is_active
      FROM market_hours
      WHERE market_type = ? AND is_active = TRUE
    `, [marketType]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        isOpen: false,
        message: 'Market is closed or not configured'
      });
    }

    const market = result.rows[0];
    
    // Get current time in market's timezone
    const now = new Date();
    const marketTimezone = market.timezone || 'Asia/Kolkata';
    
    // Convert to market timezone
    const marketTime = new Date(now.toLocaleString("en-US", { timeZone: marketTimezone }));
    const currentHour = marketTime.getHours();
    const currentMinute = marketTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // minutes since midnight
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check for holidays
    const holidayResult = await sql(`
      SELECT 
        holiday_name,
        description,
        closure_type,
        DATE_FORMAT(custom_open_time, '%H:%i:%s') as custom_open_time,
        DATE_FORMAT(custom_close_time, '%H:%i:%s') as custom_close_time
      FROM market_holidays
      WHERE market_type = ? 
        AND holiday_date = ? 
        AND is_active = TRUE
    `, [marketType, today]);

    // If today is a holiday
    if (holidayResult.rows.length > 0) {
      const holiday = holidayResult.rows[0];
      
      // If full day closure, market is closed
      if (holiday.closure_type === 'FULL_DAY') {
        return res.json({
          success: true,
          isOpen: false,
          isHoliday: true,
          holiday: holiday,
          marketType: market.market_type,
          marketName: market.market_name,
          currentTime: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
          timezone: marketTimezone,
          message: `Market is closed today for ${holiday.holiday_name}`
        });
      }
      
      // If custom hours, use those instead
      if (holiday.closure_type === 'CUSTOM_HOURS' && holiday.custom_open_time && holiday.custom_close_time) {
        const [holidayOpenHour, holidayOpenMinute] = holiday.custom_open_time.split(':').map(Number);
        const [holidayCloseHour, holidayCloseMinute] = holiday.custom_close_time.split(':').map(Number);
        const holidayOpenTime = holidayOpenHour * 60 + holidayOpenMinute;
        const holidayCloseTime = holidayCloseHour * 60 + holidayCloseMinute;
        
        const isOpen = currentTime >= holidayOpenTime && currentTime <= holidayCloseTime;
        
        return res.json({
          success: true,
          isOpen,
          isHoliday: true,
          holiday: holiday,
          marketType: market.market_type,
          marketName: market.market_name,
          currentTime: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
          customOpenTime: holiday.custom_open_time,
          customCloseTime: holiday.custom_close_time,
          timezone: marketTimezone,
          message: isOpen 
            ? `Market is open with special hours for ${holiday.holiday_name}` 
            : `Market is closed for ${holiday.holiday_name}`
        });
      }
      
      // If half day, close at 12:00
      if (holiday.closure_type === 'HALF_DAY') {
        const halfDayCloseTime = 12 * 60; // 12:00 PM
        const isOpen = currentTime >= (9 * 60 + 15) && currentTime <= halfDayCloseTime; // 9:15 AM to 12:00 PM
        
        return res.json({
          success: true,
          isOpen,
          isHoliday: true,
          holiday: holiday,
          marketType: market.market_type,
          marketName: market.market_name,
          currentTime: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
          closeTime: '12:00:00',
          timezone: marketTimezone,
          message: isOpen 
            ? `Market is open (half day) for ${holiday.holiday_name} - closes at 12:00 PM` 
            : `Market is closed for ${holiday.holiday_name}`
        });
      }
    }

    // Parse regular open and close times
    const [openHour, openMinute] = market.open_time.split(':').map(Number);
    const [closeHour, closeMinute] = market.close_time.split(':').map(Number);
    const openTimeMinutes = openHour * 60 + openMinute;
    const closeTimeMinutes = closeHour * 60 + closeMinute;

    // Check if market is open
    const isOpen = currentTime >= openTimeMinutes && currentTime <= closeTimeMinutes;

    return res.json({
      success: true,
      isOpen,
      isHoliday: false,
      marketType: market.market_type,
      marketName: market.market_name,
      currentTime: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
      openTime: market.open_time,
      closeTime: market.close_time,
      timezone: marketTimezone,
      message: isOpen ? 'Market is open' : 'Market is closed'
    });

  } catch (error) {
    console.error('[MarketHours] Error checking market status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check market status',
      error: error.message
    });
  }
}

/**
 * GET /api/admin/market-hours/:id/history
 * Get audit history for market hours (Admin only)
 */
export async function getMarketHoursHistory(req, res) {
  const { id } = req.params;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  try {
    const result = await sql(`
      SELECT 
        mha.id,
        mha.action,
        DATE_FORMAT(mha.old_open_time, '%H:%i:%s') as old_open_time,
        DATE_FORMAT(mha.new_open_time, '%H:%i:%s') as new_open_time,
        DATE_FORMAT(mha.old_close_time, '%H:%i:%s') as old_close_time,
        DATE_FORMAT(mha.new_close_time, '%H:%i:%s') as new_close_time,
        mha.changed_at,
        mha.reason,
        u.email as changed_by_email
      FROM market_hours_audit mha
      LEFT JOIN users u ON mha.changed_by = u.id
      WHERE mha.market_hours_id = ?
      ORDER BY mha.changed_at DESC
      LIMIT 50
    `, [id]);

    return res.json({
      success: true,
      data: result.rows || []
    });

  } catch (error) {
    console.error('[MarketHours] Error fetching history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: error.message
    });
  }
}
