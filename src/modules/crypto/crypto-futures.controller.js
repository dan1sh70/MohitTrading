import { z } from "zod";
import { sql } from "../../db/mysql.js";
import { getMarkPriceWithDepth, getMarkPriceHistory as getMarkPriceHistoryService } from "../../services/mark-price.service.js";
import {
  getFundingRate,
  getFundingPaymentHistory as getFundingPaymentHistoryService,
  predictFundingPayment as predictFundingPaymentService
} from "../../services/funding-fee.service.js";
import {
  setTakeProfit as setTakeProfitService,
  setStopLoss as setStopLossService,
  cancelTakeProfit as cancelTakeProfitService,
  cancelStopLoss as cancelStopLossService,
  getTriggerHistory as getTriggerHistoryService
} from "../../services/trigger-engine.service.js";
import {
  switchToCrossMargin,
  switchToIsolatedMargin,
  calculateMarginUtilization,
  enableHedgeMode as enableHedgeModeService,
  disableHedgeMode as disableHedgeModeService,
  getHedgeMode,
  getAggregatedPosition as getAggregatedPositionService
} from "../../services/advanced-margin.service.js";

export const setTakeProfitSchema = z.object({
  targetPrice: z.number().positive("Target price must be positive")
});

export const setStopLossSchema = z.object({
  stopPrice: z.number().positive("Stop price must be positive")
});

export const switchMarginModeSchema = z.object({
  mode: z.enum(["ISOLATED", "CROSS", "isolated", "cross"]),
  isolatedAmount: z.number().positive().optional()
});

export const reduceOnlySchema = z.object({
  reduceOnly: z.boolean()
});

function ok(res, data, extra = {}) {
  return res.json({ success: true, ...extra, data });
}

function fail(res, error, status = 400) {
  return res.status(status).json({
    success: false,
    message: error?.message || String(error)
  });
}

export async function getMarkPrice(req, res) {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const data = await getMarkPriceWithDepth(symbol);
    return res.json({
      success: true,
      ...data,
      lastPrice: data.markPrice,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function getMarkPriceHistory(req, res) {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const days = Number.parseInt(req.query.days || "7", 10);
    const hours = Math.max(1, days * 24);
    const rows = await getMarkPriceHistoryService(symbol, hours);
    const history = (rows.rows || rows || []).map((row) => ({
      symbol,
      markPrice: Number(row.mark_price ?? row.markPrice ?? 0),
      bidPrice: 0,
      askPrice: 0,
      lastPrice: Number(row.mark_price ?? row.markPrice ?? 0),
      timestamp: row.recorded_at ?? row.recordedAt ?? new Date().toISOString()
    }));
    return res.json({ success: true, history, data: history, count: history.length });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function getCurrentFundingRate(req, res) {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const data = await getFundingRate(symbol);
    const fundingRate = Number(data.rate ?? data.fundingRate ?? 0);
    return res.json({
      success: true,
      symbol,
      fundingRate,
      nextFundingRate: fundingRate,
      nextSettlementTime: data.nextSettlement ?? data.nextSettlementTime ?? new Date().toISOString(),
      fundingRatePercentage: `${(fundingRate * 100).toFixed(4)}%`,
      markPrice: Number(data.markPrice ?? 0),
      data
    });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function getFundingPaymentHistory(req, res) {
  try {
    const limit = Number.parseInt(req.query.limit || "10", 10);
    const symbol = req.query.symbol || null;
    const data = await getFundingPaymentHistoryService(req.user.id, symbol, limit);
    const payments = (data.payments || []).map((payment) => ({
      id: payment.id,
      positionId: payment.position_id ?? payment.positionId,
      amount: Number(payment.funding_amount ?? payment.amount ?? 0),
      fundingRate: Number(payment.funding_rate ?? payment.fundingRate ?? 0),
      settledAt: payment.settlement_time ?? payment.settledAt,
      symbol: payment.symbol ?? "",
      side: payment.side ?? "",
      positionSize: Number(payment.position_size ?? payment.positionSize ?? 0)
    }));
    return res.json({ success: true, payments, data: payments, totalAmount: data.totalAmount, count: data.count });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function predictFundingPayment(req, res) {
  try {
    const data = await predictFundingPaymentService(req.params.positionId);
    return res.json({ success: !data?.error, ...data, data });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function setTakeProfit(req, res) {
  try {
    const data = await setTakeProfitService(req.user.id, req.params.positionId, req.validatedBody.targetPrice);
    return ok(res, data, { message: "Take profit set successfully" });
  } catch (error) {
    return fail(res, error);
  }
}

export async function setStopLoss(req, res) {
  try {
    const data = await setStopLossService(req.user.id, req.params.positionId, req.validatedBody.stopPrice);
    return ok(res, data, { message: "Stop loss set successfully" });
  } catch (error) {
    return fail(res, error);
  }
}

export async function cancelTakeProfit(req, res) {
  try {
    const data = await cancelTakeProfitService(req.user.id, req.params.positionId);
    return ok(res, data, { message: "Take profit cancelled successfully" });
  } catch (error) {
    return fail(res, error);
  }
}

export async function cancelStopLoss(req, res) {
  try {
    const data = await cancelStopLossService(req.user.id, req.params.positionId);
    return ok(res, data, { message: "Stop loss cancelled successfully" });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getTriggerHistory(req, res) {
  try {
    const limit = Number.parseInt(req.query.limit || "10", 10);
    const rows = await getTriggerHistoryService(req.user.id, limit);
    const triggers = (rows.rows || rows || []).map((row) => ({
      id: row.id,
      positionId: row.position_id ?? row.positionId,
      triggerType: row.trigger_type ?? row.triggerType,
      triggerPrice: Number(row.trigger_price ?? row.triggerPrice ?? 0),
      executionPrice: Number(row.execution_price ?? row.executionPrice ?? 0),
      pnl: Number(row.pnl ?? 0),
      executedAt: row.executed_at ?? row.executedAt,
      reason: "PRICE_CROSSED"
    }));
    return res.json({ success: true, triggers, data: triggers, count: triggers.length });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function switchMarginMode(req, res) {
  try {
    const mode = req.validatedBody.mode.toUpperCase();
    const data = mode === "ISOLATED"
      ? await switchToIsolatedMargin(req.user.id, req.params.positionId, req.validatedBody.isolatedAmount)
      : await switchToCrossMargin(req.user.id, req.params.positionId);
    return res.json({
      success: true,
      positionId: String(data.positionId),
      mode: data.marginMode?.toLowerCase(),
      isolatedMargin: Number(data.isolatedMargin ?? 0),
      data
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getMarginUtilization(req, res) {
  try {
    const data = await calculateMarginUtilization(req.user.id);
    return res.json({
      success: true,
      totalMargin: Number(data.marginUsed ?? 0),
      availableBalance: Number(data.availableMargin ?? 0),
      usagePercent: Number(data.utilizationPercent ?? 0),
      ...data,
      data
    });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function enableHedgeMode(req, res) {
  try {
    const data = await enableHedgeModeService(req.user.id);
    return res.json({ success: true, hedgeModeEnabled: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function disableHedgeMode(req, res) {
  try {
    const data = await disableHedgeModeService(req.user.id);
    return res.json({ success: true, hedgeModeEnabled: false, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getHedgeModeStatus(req, res) {
  try {
    const enabled = await getHedgeMode(req.user.id);
    return res.json({ success: true, hedgeModeEnabled: Boolean(enabled), positionMode: enabled ? "HEDGE" : "ONE_WAY" });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function updateReduceOnlyFlag(req, res) {
  try {
    await sql(
      `UPDATE crypto_orders SET reduce_only = $1 WHERE id = $2 AND user_id = $3`,
      [req.validatedBody.reduceOnly, req.params.orderId, req.user.id]
    );
    return res.json({ success: true, orderId: req.params.orderId, reduceOnly: req.validatedBody.reduceOnly });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getMakerTakerFees(req, res) {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const rows = await sql(
      `SELECT maker_fee_rate, taker_fee_rate FROM crypto_fee_config WHERE symbol = $1 LIMIT 1`,
      [symbol]
    );
    const row = (rows.rows || rows || [])[0] || {};
    const makerFee = Number(row.maker_fee_rate ?? 0.0002);
    const takerFee = Number(row.taker_fee_rate ?? 0.0004);
    return res.json({ success: true, symbol, makerFee, takerFee, data: { symbol, makerFee, takerFee } });
  } catch (error) {
    return fail(res, error, 500);
  }
}

export async function getAggregatedPosition(req, res) {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const position = await getAggregatedPositionService(req.user.id, symbol);
    return res.json({ success: true, position, data: position });
  } catch (error) {
    return fail(res, error, 500);
  }
}