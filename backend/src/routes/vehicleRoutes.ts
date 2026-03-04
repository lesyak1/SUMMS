import { Router } from 'express';
import { searchVehicles, getVehicleDetails } from '../controllers/vehicleController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Assuming vehicle search is public or auth'd. Let's make it auth'd as in requirements.
router.use(authenticateToken);

router.get('/', searchVehicles);
router.get('/:id', getVehicleDetails);

export default router;
