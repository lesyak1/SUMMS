import { Router } from 'express';
import { getMe, updateMe, updateUserRole, getAllUsers } from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateMe);

// Admin routes
router.get('/admin/users', authenticateToken, requireRole(['ADMIN']), getAllUsers);
router.put('/admin/users/:id/role', authenticateToken, requireRole(['ADMIN']), updateUserRole);

export default router;
