import { Router } from 'express';
import { getRoutes } from '../controllers/transportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/routes', getRoutes);

export default router;
