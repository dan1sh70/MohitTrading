import { sql } from "../../db/mysql.js";
import { cacheGet, cacheSet } from "../../db/redis.js";

/**
 * Standardize NSE FII/DII date format into YYYY-MM-DD
 */
export function parseNseDate(dateStr) {
  try {
    const parts = dateStr.trim().split("-");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
      if (monthIndex >= 0) {
        const month = String(monthIndex + 1).padStart(2, "0");
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Fetch and sync latest FII / DII data from official NSE feed
 */
export async function syncFiiDiiData() {
  const url = "https://www.nseindia.com/api/fiidiiTradeReact";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`NSE FII/DII HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No FII/DII records returned by NSE");
    }

    let recordsInserted = 0;
    for (const item of data) {
      const rawCat = (item.category || "").toUpperCase();
      const category = rawCat.includes("DII") ? "DII" : "FII";
      const dateFormatted = parseNseDate(item.date);
      const buyValue = parseFloat(item.buyValue) || 0;
      const sellValue = parseFloat(item.sellValue) || 0;
      const netValue = parseFloat(item.netValue) || +(buyValue - sellValue).toFixed(2);

      await sql(
        `INSERT INTO fii_dii_records 
         (reporting_date, category, market_type, buy_value, sell_value, net_value, is_provisional, source)
         VALUES ($1, $2, 'CASH', $3, $4, $5, FALSE, 'NSE')
         ON DUPLICATE KEY UPDATE 
           buy_value = VALUES(buy_value),
           sell_value = VALUES(sell_value),
           net_value = VALUES(net_value),
           updated_at = CURRENT_TIMESTAMP`,
        [dateFormatted, category, buyValue, sellValue, netValue]
      );
      recordsInserted++;
    }

    return { success: true, count: recordsInserted };
  } catch (err) {
    console.warn("[FiiDii] Failed to sync live from NSE:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get daily FII / DII data
 */
export async function getDailyFiiDii(date = null) {
  // Sync if needed
  await syncFiiDiiData().catch(() => {});

  let query = `SELECT * FROM fii_dii_records`;
  const params = [];

  if (date) {
    query += ` WHERE reporting_date = $1 ORDER BY category ASC`;
    params.push(date);
  } else {
    query += ` WHERE reporting_date = (SELECT MAX(reporting_date) FROM fii_dii_records) ORDER BY category ASC`;
  }

  const rows = await sql(query, params);

  const fii = rows.find(r => r.category === "FII") || null;
  const dii = rows.find(r => r.category === "DII") || null;

  return {
    reportingDate: rows[0]?.reporting_date || new Date().toISOString().split("T")[0],
    fii: fii ? {
      category: "FII",
      buyValue: Number(fii.buy_value),
      sellValue: Number(fii.sell_value),
      netValue: Number(fii.net_value),
      marketType: fii.market_type,
      isProvisional: Boolean(fii.is_provisional),
      source: fii.source
    } : null,
    dii: dii ? {
      category: "DII",
      buyValue: Number(dii.buy_value),
      sellValue: Number(dii.sell_value),
      netValue: Number(dii.net_value),
      marketType: dii.market_type,
      isProvisional: Boolean(dii.is_provisional),
      source: dii.source
    } : null,
    combinedNetValue: +((Number(fii?.net_value || 0) + Number(dii?.net_value || 0)).toFixed(2))
  };
}

/**
 * Get monthly aggregated FII / DII data
 */
export async function getMonthlyFiiDii(year = null) {
  let query = `
    SELECT 
      DATE_FORMAT(reporting_date, '%Y-%m') AS month,
      category,
      SUM(buy_value) AS total_buy,
      SUM(sell_value) AS total_sell,
      SUM(net_value) AS net_investment,
      COUNT(DISTINCT reporting_date) AS trading_days
    FROM fii_dii_records
  `;
  const params = [];
  if (year) {
    query += ` WHERE YEAR(reporting_date) = $1`;
    params.push(year);
  }
  query += ` GROUP BY month, category ORDER BY month DESC, category ASC`;

  const rows = await sql(query, params);

  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.month]) {
      grouped[r.month] = { month: r.month, fii: null, dii: null };
    }
    const cat = r.category.toLowerCase();
    grouped[r.month][cat] = {
      totalBuy: Number(r.total_buy),
      totalSell: Number(r.total_sell),
      netInvestment: Number(r.net_investment),
      tradingDays: Number(r.trading_days)
    };
  }

  return Object.values(grouped);
}

/**
 * Get historical records with optional date range
 */
export async function getFiiDiiHistory(startDate = null, endDate = null, limit = 30) {
  let query = `SELECT * FROM fii_dii_records WHERE 1=1`;
  const params = [];

  if (startDate) {
    query += ` AND reporting_date >= $${params.length + 1}`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND reporting_date <= $${params.length + 1}`;
    params.push(endDate);
  }

  query += ` ORDER BY reporting_date DESC, category ASC LIMIT $${params.length + 1}`;
  params.push(limit * 2);

  const rows = await sql(query, params);

  const byDate = {};
  for (const r of rows) {
    const d = r.reporting_date.toISOString().split("T")[0];
    if (!byDate[d]) {
      byDate[d] = {
        date: d,
        fiiBuy: 0,
        fiiSell: 0,
        fiiNet: 0,
        diiBuy: 0,
        diiSell: 0,
        diiNet: 0,
        totalNet: 0,
        source: r.source,
        isProvisional: Boolean(r.is_provisional)
      };
    }
    if (r.category === "FII") {
      byDate[d].fiiBuy = Number(r.buy_value);
      byDate[d].fiiSell = Number(r.sell_value);
      byDate[d].fiiNet = Number(r.net_value);
    } else {
      byDate[d].diiBuy = Number(r.buy_value);
      byDate[d].diiSell = Number(r.sell_value);
      byDate[d].diiNet = Number(r.net_value);
    }
    byDate[d].totalNet = +(byDate[d].fiiNet + byDate[d].diiNet).toFixed(2);
  }

  return Object.values(byDate);
}

/**
 * Advanced analytics: trends, comparisons, streaks
 */
export async function getFiiDiiAnalytics() {
  const history = await getFiiDiiHistory(null, null, 60);
  if (!history.length) {
    return { message: "Insufficient FII/DII history for analytics" };
  }

  // Calculate consecutive buying/selling days for FII and DII
  let fiiStreakType = null;
  let fiiStreakDays = 0;
  let diiStreakType = null;
  let diiStreakDays = 0;

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const fiiNet = h.fiiNet;
    const isFiiBuy = fiiNet >= 0;

    if (i === 0) {
      fiiStreakType = isFiiBuy ? "BUYING" : "SELLING";
      fiiStreakDays = 1;
    } else if ((isFiiBuy && fiiStreakType === "BUYING") || (!isFiiBuy && fiiStreakType === "SELLING")) {
      fiiStreakDays++;
    } else {
      break;
    }
  }

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const diiNet = h.diiNet;
    const isDiiBuy = diiNet >= 0;

    if (i === 0) {
      diiStreakType = isDiiBuy ? "BUYING" : "SELLING";
      diiStreakDays = 1;
    } else if ((isDiiBuy && diiStreakType === "BUYING") || (!isDiiBuy && diiStreakType === "SELLING")) {
      diiStreakDays++;
    } else {
      break;
    }
  }

  // Last 5 days comparison
  const last5Days = history.slice(0, 5);
  const total5DaysFiiNet = +(last5Days.reduce((acc, h) => acc + h.fiiNet, 0).toFixed(2));
  const total5DaysDiiNet = +(last5Days.reduce((acc, h) => acc + h.diiNet, 0).toFixed(2));

  // Dominant institutional participant
  const dominant = Math.abs(total5DaysFiiNet) > Math.abs(total5DaysDiiNet) ? "FII" : "DII";

  return {
    latestReportingDate: history[0]?.date,
    fiiStreak: {
      action: fiiStreakType,
      consecutiveDays: fiiStreakDays
    },
    diiStreak: {
      action: diiStreakType,
      consecutiveDays: diiStreakDays
    },
    rolling5Days: {
      fiiNetTotal: total5DaysFiiNet,
      diiNetTotal: total5DaysDiiNet,
      combinedNet: +(total5DaysFiiNet + total5DaysDiiNet).toFixed(2),
      dominantForce: dominant
    },
    institutionalSentiment: total5DaysFiiNet + total5DaysDiiNet > 0 ? "BULLISH" : "BEARISH",
    recentTrends: last5Days.map(d => ({
      date: d.date,
      fiiNet: d.fiiNet,
      diiNet: d.diiNet,
      totalNet: d.totalNet
    }))
  };
}

