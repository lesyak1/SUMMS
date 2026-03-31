import { Router } from 'express';
import { getGatewayAnalytics, getRentalAnalytics } from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/analytics/rentals', requireRole(['ADMIN', 'MOBILITY_PROVIDER']), getRentalAnalytics);
router.get('/analytics/gateway', requireRole(['ADMIN']), getGatewayAnalytics);

export default router;