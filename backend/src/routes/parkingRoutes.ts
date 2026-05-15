import { Router } from 'express';
import { listSpots, reserveSpot, unreserveSpot } from '../controllers/parkingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listSpots);
router.post('/reservations', reserveSpot);
router.delete('/reservations/:spotId', unreserveSpot);

export default router;
