import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { HttpError } from './errorHandler.js';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo (photos de téléphone souvent > 5 Mo)
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Extension à déduire du type MIME quand le nom de fichier n'en porte pas
// (certaines caméras mobiles envoient un nom sans extension).
const EXTENSION_FROM_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Le dossier d'upload est créé au démarrage s'il n'existe pas encore.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),

  // Nom de fichier unique : "timestamp-nom.ext".
  // Le nom original est nettoyé (accents retirés, caractères dangereux exclus)
  // pour éviter toute injection via le chemin de fichier.
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    // Si l'extension n'est pas une extension image connue (ou absente),
    // on la déduit du type MIME pour garder un Content-Type correct.
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      ext = EXTENSION_FROM_MIME[file.mimetype] || '';
    }

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

// Filtre d'acceptation : JPEG, PNG et WEBP.
// On accepte si le type MIME est connu OU si l'extension du nom de fichier
// est une extension image connue (certains navigateurs mobiles envoient
// "image/jpg" ou "application/octet-stream" pour un .jpg/.png valide).
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }
  return cb(
    new HttpError(400, "Format d'image non autorisé. Formats acceptés : JPEG, PNG, WEBP (pas de HEIC/AVIF).")
  );
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});