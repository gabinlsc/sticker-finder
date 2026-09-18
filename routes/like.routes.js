import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { likeSticker } from '../controllers/like.controller.js';

const router = Router();

// Ajout d'un like sur un sticker (protégé).
router.post('/stickers/:id/like', verifyJWT, likeSticker);

export default router;