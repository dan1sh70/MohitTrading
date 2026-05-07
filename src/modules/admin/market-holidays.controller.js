import { sql } from "../../db/index.js";
import { writeAuditLog } from "../../modules/audit/audit.service.js";

// ═══════════════════════════════════════════════════════════════════════════
// MARKET HOLIDAYS CONTROLLER
// Admin-controlled special market closures (holidays, events)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/market-holidays
 * Get all market holidays for a specific market type
 */
export async function getMarketHolidays(req, res) {
  const { marketType = 'indian_stock', year } = req.query;

  try {
    let query = `
      SELECT 
        id,
        market_type,
        DATE_FORMAT(holiday_date, '%Y-%m-%d') as holiday_date,
        holiday_name,
        description,
        closure_type,
        DATE_FORMAT(custom_open_time, '%H:%i:%s') as custom_open_time,
        DATE_FORMAT(custom_close_time, '%H:%i:%s') as custom_close_time,
        is_recurring,
        recurring_pattern,
        is_active,
        created_at,
        updated_at
      FROM market_holidays
      WHERE market_type = ? AND is_active = TRUE
    `;
    
    const params = [marketType];

    if (year) {
      query += ` AND YEAR(holiday_date) = ?`;
      params.push(year);
    }

    query += ` ORDER BY holiday_date ASC`;

    const result = await sql(query, params);

    return res.json({
      success: true,
      data: result.rows || [],
      count: result.rows.length
    });

  } catch (error) {
    console.error('[MarketHolidays] Error fetching holidays:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch market holidays',
      error: error.message
    });
  }
}

/**
 * GET /api/admin/market-holidays/:id
 * Get specific holiday details
 */
export async function getMarketHolidayById(req, res) {
  const { id } = req.params;

  try {
    const result = await sql(`
      SELECT 
        id,
        market_type,
        DATE_FORMAT(holiday_date, '%Y-%m-%d') as holiday_date,
        holiday_name,
        description,
        closure_type,
        DATE_FORMAT(custom_open_time, '%H:%i:%s') as custom_open_time,
        DATE_FORMAT(custom_close_time, '%H:%i:%s') as custom_close_time,
        is_recurring,
        recurring_pattern,
        is_active,
        created_at,
        updated_at
      FROM market_holidays
      WHERE id = ?
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('[MarketHolidays] Error fetching holiday:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch holiday details',
      error: error.message
    });
  }
}

/**
 * POST /api/admin/market-holidays
 * Create new market holiday (Admin only)
 */
export async function createMarketHoliday(req, res) {
  const { 
    market_type = 'indian_stock',
    holiday_date, 
    holiday_name, 
    description,
    closure_type = 'FULL_DAY',
    custom_open_time,
    custom_close_time,
    is_recurring = false,
    recurring_pattern
  } = req.validatedBody;
  
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  if (!holiday_date || !holiday_name) {
    return res.status(400).json({
      success: false,
      message: 'holiday_date and holiday_name are required'
    });
  }

  try {
    const result = await sql(`
      INSERT INTO market_holidays 
      (market_type, holiday_date, holiday_name, description, closure_type, 
       custom_open_time, custom_close_time, is_recurring, recurring_pattern, 
       created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      market_type, holiday_date, holiday_name, description, closure_type,
      custom_open_time || null, custom_close_time || null, is_recurring, recurring_pattern,
      adminId, adminId
    ]);

    const newId = result.insertId;

    // Write audit log
    await writeAuditLog({
      actorUserId: adminId,
      action: 'MARKET_HOLIDAY_CREATE',
      targetType: 'market_holiday',
      targetId: String(newId),
      details: { market_type, holiday_date, holiday_name, closure_type }
    });

    return res.status(201).json({
      success: true,
      message: 'Market holiday created successfully',
      data: {
        id: newId,
        market_type,
        holiday_date,
        holiday_name,
        closure_type
      }
    });

  } catch (error) {
    console.error('[MarketHolidays] Error creating holiday:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A holiday already exists for this date and market type'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create market holiday',
      error: error.message
    });
  }
}

/**
 * PUT /api/admin/market-holidays/:id
 * Update market holiday (Admin only)
 */
export async function updateMarketHoliday(req, res) {
  const { id } = req.params;
  const { 
    holiday_date, 
    holiday_name, 
    description,
    closure_type,
    custom_open_time,
    custom_close_time,
    is_recurring,
    recurring_pattern,
    is_active
  } = req.validatedBody;
  
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  try {
    // Build dynamic update query
    const updates = [];
    const params = [];

    if (holiday_date !== undefined) {
      updates.push('holiday_date = ?');
      params.push(holiday_date);
    }
    if (holiday_name !== undefined) {
      updates.push('holiday_name = ?');
      params.push(holiday_name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (closure_type !== undefined) {
      updates.push('closure_type = ?');
      params.push(closure_type);
    }
    if (custom_open_time !== undefined) {
      updates.push('custom_open_time = ?');
      params.push(custom_open_time || null);
    }
    if (custom_close_time !== undefined) {
      updates.push('custom_close_time = ?');
      params.push(custom_close_time || null);
    }
    if (is_recurring !== undefined) {
      updates.push('is_recurring = ?');
      params.push(is_recurring);
    }
    if (recurring_pattern !== undefined) {
      updates.push('recurring_pattern = ?');
      params.push(recurring_pattern);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_by = ?');
    params.push(adminId);
    params.push(id);

    const query = `UPDATE market_holidays SET ${updates.join(', ')} WHERE id = ?`;
    const result = await sql(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    // Write audit log
    await writeAuditLog({
      actorUserId: adminId,
      action: 'MARKET_HOLIDAY_UPDATE',
      targetType: 'market_holiday',
      targetId: String(id),
      details: { updated_fields: Object.keys(req.validatedBody) }
    });

    return res.json({
      success: true,
      message: 'Market holiday updated successfully'
    });

  } catch (error) {
    console.error('[MarketHolidays] Error updating holiday:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update market holiday',
      error: error.message
    });
  }
}

/**
 * DELETE /api/admin/market-holidays/:id
 * Delete market holiday (Admin only)
 */
export async function deleteMarketHoliday(req, res) {
  const { id } = req.params;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  try {
    // Soft delete - just mark as inactive
    const result = await sql(`
      UPDATE market_holidays 
      SET is_active = FALSE, updated_by = ?
      WHERE id = ?
    `, [adminId, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    // Write audit log
    await writeAuditLog({
      actorUserId: adminId,
      action: 'MARKET_HOLIDAY_DELETE',
      targetType: 'market_holiday',
      targetId: String(id),
      details: { id }
    });

    return res.json({
      success: true,
      message: 'Market holiday deleted successfully'
    });

  } catch (error) {
    console.error('[MarketHolidays] Error deleting holiday:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete market holiday',
      error: error.message
    });
  }
}

/**
 * GET /api/market-holidays/check/:marketType
 * Check if today is a holiday (Public endpoint)
 */
export async function checkTodayHoliday(req, res) {
  const { marketType } = req.params;

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const result = await sql(`
      SELECT 
        id,
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

    if (result.rows.length > 0) {
      const holiday = result.rows[0];
      return res.json({
        success: true,
        isHoliday: true,
        holiday: holiday,
        message: `Market is closed today for ${holiday.holiday_name}`
      });
    }

    return res.json({
      success: true,
      isHoliday: false,
      message: 'Today is a regular trading day'
    });

  } catch (error) {
    console.error('[MarketHolidays] Error checking holiday:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check holiday status',
      error: error.message
    });
  }
}

/**
 * POST /api/admin/market-holidays/bulk-create
 * Bulk create holidays for a year (Admin only)
 */
export async function bulkCreateHolidays(req, res) {
  const { 
    market_type = 'indian_stock',
    year,
    holidays 
  } = req.validatedBody;
  
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  if (!year || !Array.isArray(holidays) || holidays.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'year and holidays array are required'
    });
  }

  try {
    const results = [];
    const errors = [];

    for (const holiday of holidays) {
      try {
        const result = await sql(`
          INSERT INTO market_holidays 
          (market_type, holiday_date, holiday_name, description, closure_type, 
           is_recurring, recurring_pattern, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            holiday_name = VALUES(holiday_name),
            description = VALUES(description),
            closure_type = VALUES(closure_type),
            is_recurring = VALUES(is_recurring),
            updated_by = VALUES(updated_by)
        `, [
          market_type,
          `${year}-${holiday.month}-${holiday.day}`,
          holiday.name,
          holiday.description || null,
          holiday.closure_type || 'FULL_DAY',
          holiday.is_recurring || false,
          holiday.recurring_pattern || null,
          adminId,
          adminId
        ]);

        results.push({
          date: `${year}-${holiday.month}-${holiday.day}`,
          name: holiday.name,
          id: result.insertId
        });
      } catch (err) {
        errors.push({
          date: `${year}-${holiday.month}-${holiday.day}`,
          name: holiday.name,
          error: err.message
        });
      }
    }

    // Write audit log
    await writeAuditLog({
      actorUserId: adminId,
      action: 'MARKET_HOLIDAY_BULK_CREATE',
      targetType: 'market_holiday',
      targetId: 'bulk',
      details: { year, market_type, created: results.length, errors: errors.length }
    });

    return res.json({
      success: true,
      message: `Created ${results.length} holidays, ${errors.length} errors`,
      data: {
        created: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('[MarketHolidays] Error bulk creating holidays:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk create holidays',
      error: error.message
    });
  }
}
