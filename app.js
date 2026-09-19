import path from 'path';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import stickerRoutes from './routes/sticker.routes.js';
import likeRoutes from './routes/like.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// --- Middlewares globaux ---
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// --- Point de contrôle (health check) ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- Fichiers statiques ---
// Les photos de stickers sont servies depuis public/uploads via /uploads/....
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stickers', stickerRoutes);
app.use('/api', likeRoutes);
app.use('/api/admin', adminRoutes);

// --- Erreurs ---
// Aucune route trouvée
app.use(notFound);
// Handler d'erreurs centralisé (toujours en dernier)
app.use(errorHandler);

export default app;