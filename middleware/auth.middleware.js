import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler.js';

// Middleware de protection des routes privées (à monter dès l'étape suivante).
// Extrait le token "Bearer", vérifie sa signature et injecte req.user.
export function verifyJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Token manquant ou mal formaté.');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Seules les infos minimales nécessaires sont exposées au reste de l'app.
    req.user = {
      id: payload.id,
      pseudo: payload.pseudo,
      role: payload.role || 'user',
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'Session expirée, reconnectez-vous.'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new HttpError(401, 'Token invalide.'));
    }
    return next(error);
  }
}

// Garde d'administration : à monter APRÈS verifyJWT sur les routes admin.
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(new HttpError(403, 'Accès réservé aux administrateurs.'));
  }
  return next();
}