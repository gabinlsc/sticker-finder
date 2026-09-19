import { Router } from 'express';
import { verifyJWT, requireAdmin } from '../middleware/auth.middleware.js';
import {
  deleteUser,
  listUsers,
  updateUserRole,
} from '../controllers/admin.controller.js';
import { deleteSticker } from '../controllers/sticker.controller.js';

const router = Router();

// Toutes les routes admin exigent un compte connecté avec le rôle admin.
router.use(verifyJWT, requireAdmin);

// Gestion des comptes
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Gestion des pins : un admin supprime n'importe quel sticker.
router.delete('/stickers/:id', deleteSticker);

export default router;