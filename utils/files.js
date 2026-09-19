import path from 'path';
import fs from 'fs/promises';

// Racine du dossier des photos uploadées.
export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Supprime le fichier photo référencé par une URL publique du type
// "/uploads/nom-fichier.png". Silencieux si le fichier n'existe pas.
export async function deleteUploadedFile(publicUrl) {
  if (!publicUrl || !publicUrl.startsWith('/uploads/')) return;

  const filename = path.basename(publicUrl);
  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    await fs.unlink(filePath);
  } catch {
    // Fichier déjà absent : rien à faire.
  }
}