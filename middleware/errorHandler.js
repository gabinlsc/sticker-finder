// Erreur métier porteur d'un code HTTP. Relayée jusqu'au handler global
// via next(error) pour une réponse JSON normalisée.
export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

// Intercepteur de routes inconnues (404).
export function notFound(req, res, next) {
  next(new HttpError(404, 'Route introuvable.'));
}

// Handler d'erreurs global : logge les erreurs 500 pour le debug,
// mais ne renvoie au client que des messages neutres dans ce cas.
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode ?? 500;

  if (statusCode >= 500) {
    console.error(`[ERREUR] ${err.stack || err.message}`);
  }

  const message =
    statusCode >= 500 ? 'Erreur interne du serveur.' : err.message;

  res.status(statusCode).json({ error: message });
}