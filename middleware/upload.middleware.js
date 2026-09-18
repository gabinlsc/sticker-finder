import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { HttpError } from './errorHandler.js';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Le dossier d'upload est créé au démarrage s'il n'existe pas encore.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),

  // Nom de fichier unique : "timestamp-nom.jpg".
  // Le nom original est nettoyé (accents retirés, caractères dangereux exclus)
  // pour éviter toute injection via le chemin de fichier.
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base =
      path
        .basename(file.originalname, ext)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '')
        .slice(0, 50) || 'sticker';

    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

// Filtre d'acceptation : uniquement JPEG, PNG et WEBP.
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(null, true);
  }
  return cb(
    new HttpError(400, "Format d'image non autorisé. Formats acceptés : JPEG, PNG, WEBP.")
  );
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});