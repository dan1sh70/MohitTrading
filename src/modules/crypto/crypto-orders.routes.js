// ═════════════════════════════════════════════════════════════════════════════
// CRYPTO ORDERS ROUTES
// ═════════════════════════════════════════════════════════════════════════════

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import {
  placeBuyOrder,
  placeSellOrder,
  getPositions,
  getPositionDetails,
  closePositionEndpoint,
  getOrders,
  cancelOrderEndpoint,
  getCryptoPerformance,
  getTrades,
  checkPositionLiquidation,
  getAccountBalance,
  getOrderbook
} from './crypto-orders.controller.js';

const router = express.Router();

// ───────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ───────────────────────────────────────────────────────────────────────────

// All routes require authentication
router.use(authenticate);

// ───────────────────────────────────────────────────────────────────────────
// ORDER PLACEMENT
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/crypto/orders/buy
 * Place a BUY order
 * Body: { symbol, quantity, price?, leverage?, tradingMode?, orderType? }
 */
router.post('/orders/buy', validateRequest('body'), placeBuyOrder);

/**
 * POST /api/crypto/orders/sell
 * Place a SELL order
 * Body: { symbol, quantity, price?, leverage?, tradingMode?, orderType? }
 */
router.post('/orders/sell', validateRequest('body'), placeSellOrder);

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
router.post('/positions/:positionId/close', closePositionEndpoint);

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

export default router;
