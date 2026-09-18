import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { getMe, login, register } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyJWT, getMe);

export default router;