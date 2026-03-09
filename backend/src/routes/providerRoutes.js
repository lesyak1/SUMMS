import { Router } from 'express';
import { addVehicle, updateVehicle, removeVehicle, getProviders, createProvider, getManageableVehicles } from '../controllers/providerController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
const router = Router();
// Only MOBILITY_PROVIDER or ADMIN could potentially manage vehicles. Let's allow MOBILITY_PROVIDER for now.
router.use(authenticateToken, requireRole(['MOBILITY_PROVIDER', 'ADMIN']));
router.get('/profiles', getProviders);
router.post('/profiles', createProvider);
router.get('/vehicles', getManageableVehicles);
router.post('/vehicles', addVehicle);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', removeVehicle);
export default router;
//# sourceMappingURL=providerRoutes.js.map