import { Router } from 'express';
import { listSpots, reserveSpot } from '../controllers/parkingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listSpots);
router.post('/reservations', reserveSpot);

export default router;
