import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// --- Middlewares globaux ---
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// --- Point de contrôle (health check) ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- Routes ---
app.use('/api/auth', authRoutes);

// --- Erreurs ---
// Aucune route trouvée
app.use(notFound);
// Handler d'erreurs centralisé (toujours en dernier)
app.use(errorHandler);

export default app;