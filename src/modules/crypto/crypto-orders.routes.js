// ═════════════════════════════════════════════════════════════════════════════
// CRYPTO ORDERS ROUTES
// ═════════════════════════════════════════════════════════════════════════════

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  cancelStopLoss,
  cancelTakeProfit,
  disableHedgeMode,
  enableHedgeMode,
  getAggregatedPosition,
  getCurrentFundingRate,
  getFundingPaymentHistory,
  getHedgeModeStatus,
  getMakerTakerFees,
  getMarginUtilization,
  getMarkPrice,
  getMarkPriceHistory,
  getTriggerHistory,
  predictFundingPayment,
  reduceOnlySchema,
  setStopLoss,
  setStopLossSchema,
  setTakeProfit,
  setTakeProfitSchema,
  switchMarginMode,
  switchMarginModeSchema,
  updateReduceOnlyFlag
} from './crypto-futures.controller.js';
import { cancelOrderEndpoint, checkPositionLiquidation, closePositionEndpoint, closePositionSchema, getAccountBalance, getCryptoPerformance, getOrderbook, getOrders, getPortfolioHealth, getPositionDetails, getPositions, getReportCard, getRiskMeter, getTrades, placeBuyOrder, placeBuyOrderSchema, placeSellOrder, placeSellOrderSchema } from './crypto-orders.controller.js';

const router = express.Router();

// ───────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ───────────────────────────────────────────────────────────────────────────

// All routes require authentication
router.use(requireAuth);

// ───────────────────────────────────────────────────────────────────────────
// ORDER PLACEMENT
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/crypto/orders/buy
 * Place a BUY order
 * Body: { symbol, quantity, price?, leverage?, tradingMode?, orderType? }
 */
router.post('/orders/buy', validateBody(placeBuyOrderSchema), placeBuyOrder);

/**
 * POST /api/crypto/orders/sell
 * Place a SELL order
 * Body: { symbol, quantity, price?, leverage?, tradingMode?, orderType? }
 */
router.post('/orders/sell', validateBody(placeSellOrderSchema), placeSellOrder);

// ───────────────────────────────────────────────────────────────────────────
// ORDER MANAGEMENT
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/crypto/orders
 * Get all orders for user
 * Query: status? (OPEN, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED)
 */
router.get('/orders', getOrders);

/**
 * POST /api/crypto/orders/:orderId/cancel
 * Cancel an open order
 */
router.post('/orders/:orderId/cancel', cancelOrderEndpoint);

// ───────────────────────────────────────────────────────────────────────────
// POSITION MANAGEMENT
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/crypto/positions
 * Get all active positions
 */
router.get('/positions', getPositions);

/**
 * GET /api/crypto/positions/:positionId
 * Get position details with current P&L
 */
router.get('/positions/:positionId', getPositionDetails);

/**
 * POST /api/crypto/positions/:positionId/close
 * Close a position
 * Body: { closingPrice? }
 */
router.post('/positions/:positionId/close', validateBody(closePositionSchema), closePositionEndpoint);

/**
 * GET /api/crypto/positions/:positionId/liquidation-check
 * Check liquidation status and auto-liquidate if needed
 */
router.get('/positions/:positionId/liquidation-check', checkPositionLiquidation);

// ───────────────────────────────────────────────────────────────────────────
// PERFORMANCE & ANALYTICS
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/crypto/performance
 * Get user's performance metrics
 */
router.get('/performance', getCryptoPerformance);

/**
 * GET /api/crypto/portfolio-health
 * Get user's focused portfolio health metrics
 */
router.get('/portfolio-health', getPortfolioHealth);

/**
 * GET /api/crypto/risk-meter
 * Get user's focused risk assessment metrics
 */
router.get('/risk-meter', getRiskMeter);

/**
 * GET /api/crypto/report-card
 * Get user's full Tradefinity v2.1 report card
 */
router.get('/report-card', getReportCard);

/**
 * GET /api/crypto/trades
 * Get closed trades
 * Query: limit? (default: 50)
 */
router.get('/trades', getTrades);

// ───────────────────────────────────────────────────────────────────────────
// ACCOUNT & BALANCE
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/crypto/account/balance
 * Get account balance and equity
 */
router.get('/account/balance', getAccountBalance);

// ───────────────────────────────────────────────────────────────────────────
// MARKET DATA
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/crypto/orderbook/:symbol
 * Get orderbook for a symbol
 */
router.get('/orderbook/:symbol', getOrderbook);

// ───────────────────────────────────────────────────────────────────────────
// ADVANCED FUTURES ENDPOINTS
// ───────────────────────────────────────────────────────────────────────────

router.get('/mark-price/:symbol', getMarkPrice);
router.get('/mark-price/:symbol/history', getMarkPriceHistory);
router.get('/current-funding-rate/:symbol', getCurrentFundingRate);
router.get('/funding/rates/:symbol', getCurrentFundingRate);
router.get('/funding/payments', getFundingPaymentHistory);
router.get('/funding/predict/:positionId', predictFundingPayment);
router.post('/positions/:positionId/take-profit', validateBody(setTakeProfitSchema), setTakeProfit);
router.post('/positions/:positionId/stop-loss', validateBody(setStopLossSchema), setStopLoss);
router.delete('/positions/:positionId/take-profit', cancelTakeProfit);
router.delete('/positions/:positionId/stop-loss', cancelStopLoss);
router.get('/triggers/history', getTriggerHistory);
router.post('/positions/:positionId/margin-mode', validateBody(switchMarginModeSchema), switchMarginMode);
router.get('/margin-utilization', getMarginUtilization);
router.post('/hedge-mode/enable', enableHedgeMode);
router.post('/hedge-mode/disable', disableHedgeMode);
router.get('/hedge-mode/status', getHedgeModeStatus);
router.post('/positions/:positionId/reduce-only', validateBody(reduceOnlySchema), updateReduceOnlyFlag);
router.get('/fees/config/:symbol', getMakerTakerFees);
router.get('/positions/aggregated/:symbol', getAggregatedPosition);

export default router;
