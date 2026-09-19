import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { uploadImage } from '../middleware/upload.middleware.js';
import {
  deleteMe,
  getPublicProfile,
  updateMe,
  regenerateApiKey,
} from '../controllers/user.controller.js';

const router = Router();

// Profil courant / mise à jour du profil (ordre avant :pseudo).
router.patch('/me', verifyJWT, uploadImage.single('avatar'), updateMe);
router.post('/me/api-key', verifyJWT, regenerateApiKey);
router.delete('/me', verifyJWT, deleteMe);

// Profil public, ouvert à tous.
router.get('/:pseudo', getPublicProfile);

export default router;