import { Router } from 'express';
import { getRentalAnalytics, getGatewayAnalytics } from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, requireRole(['ADMIN']));

router.get('/analytics/rentals', getRentalAnalytics);
router.get('/analytics/gateway', getGatewayAnalytics);

export default router;
