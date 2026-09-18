import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { uploadImage } from '../middleware/upload.middleware.js';
import {
  createSticker,
  getStickers,
} from '../controllers/sticker.controller.js';

const router = Router();

// Consultation du flux (publique).
router.get('/', getStickers);

// Ajout d'un sticker : protégé, upload d'une image unique.
router.post('/', verifyJWT, uploadImage.single('image'), createSticker);

export default router;