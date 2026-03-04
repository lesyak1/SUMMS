import { Router } from 'express';
import { getMe, updateMe, updateUserRole } from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateMe);

// Admin routes
router.put('/admin/users/:id/role', authenticateToken, requireRole(['ADMIN']), updateUserRole);

export default router;
