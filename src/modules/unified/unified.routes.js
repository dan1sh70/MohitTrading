import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  placeBuyOrderSchema,
  placeSellOrderSchema,
  closePositionSchema,
  placeBuyOrder,
  placeSellOrder,
  getOrders,
  cancelOrderEndpoint,
  getPositions,
  getPositionDetails,
  closePositionEndpoint,
  checkPositionLiquidation,
  getUnifiedPerformance,
  getPortfolioHealth,
  getRiskMeter,
  getReportCard,
  getTrades,
  getHistory
} from './unified.controller.js';

export default function createUnifiedRouter(assetClass) {
  const router = express.Router();
  
  // Inject assetClass into all requests for this router
  router.use((req, res, next) => {
    req.assetClass = assetClass;
    next();
  });

  // All routes require authentication
  router.use(requireAuth);

  // ORDER PLACEMENT
  router.post('/buy', validateBody(placeBuyOrderSchema), placeBuyOrder);
  router.post('/sell', validateBody(placeSellOrderSchema), placeSellOrder);

  // ORDER MANAGEMENT
  router.get('/', getOrders);
  router.post('/:orderId/cancel', cancelOrderEndpoint);

  // POSITION MANAGEMENT
  router.get('/positions', getPositions);
  router.get('/positions/:positionId', getPositionDetails);
  router.post('/positions/:positionId/close', validateBody(closePositionSchema), closePositionEndpoint);
  router.get('/positions/:positionId/liquidation-check', checkPositionLiquidation);

  // PERFORMANCE & ANALYTICS
  router.get('/performance', getUnifiedPerformance);
  router.get('/portfolio-health', getPortfolioHealth);
  router.get('/risk-meter', getRiskMeter);
  router.get('/report-card', getReportCard);
  router.get('/trades', getTrades);
  router.get('/history', getHistory);

  return router;
}
