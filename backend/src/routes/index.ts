import { Router } from 'express';
import type { Request, Response } from 'express';
import userRoutes from './userRoutes.js';
import providerRoutes from './providerRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import parkingRoutes from './parkingRoutes.js';
import transportRoutes from './transportRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.use('/', userRoutes);
router.use('/provider', providerRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/bookings', bookingRoutes);
router.use('/parking-spots', parkingRoutes);
router.use('/public-transport', transportRoutes);
router.use('/admin', adminRoutes);

// A simple health check route
router.get('/health', (req: Request, res: Response) => res.json({ status: 'OK' }));

export default router;
