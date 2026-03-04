import { Router } from 'express';
import { getMyBookings, reserveVehicle, startRental, endRental, payRental } from '../controllers/bookingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/me', getMyBookings);
router.post('/', reserveVehicle);
router.post('/:id/start', startRental);
router.post('/:id/end', endRental);
router.post('/:id/pay', payRental);

export default router;
