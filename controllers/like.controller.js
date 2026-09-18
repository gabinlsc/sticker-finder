import pool from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

const XP_PER_LIKE = 10;

// POST /api/stickers/:id/like — route protégée.
// Le bloc likes est ouvert en transaction pour garantir l'atomicité
// entre l'insertion du like et le crédit d'XP de l'auteur du sticker.
export async function likeSticker(req, res, next) {
  try {
    const stickerId = Number(req.params.id);
    if (!Number.isInteger(stickerId) || stickerId <= 0) {
      throw new HttpError(400, 'Identifiant de sticker invalide.');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [stickerRows] = await connection.query(
        'SELECT id, user_id FROM stickers WHERE id = ?',
        [stickerId]
      );

      if (stickerRows.length === 0) {
        throw new HttpError(404, 'Sticker introuvable.');
      }
      const sticker = stickerRows[0];

      // Anti-spam : un utilisateur ne peut liker le même sticker qu'une fois.
      const [existingRows] = await connection.query(
        'SELECT 1 FROM likes WHERE user_id = ? AND sticker_id = ?',
        [req.user.id, stickerId]
      );

      if (existingRows.length > 0) {
        throw new HttpError(409, 'Vous avez déjà liké ce sticker.');
      }

      await connection.query(
        'INSERT INTO likes (user_id, sticker_id) VALUES (?, ?)',
        [req.user.id, stickerId]
      );

      // Règle métier : +10 XP pour le CRÉATEUR du sticker (pas le liker).
      await connection.query('UPDATE users SET xp = xp + ? WHERE id = ?', [
        XP_PER_LIKE,
        sticker.user_id,
      ]);

      const [countRows] = await connection.query(
        'SELECT COUNT(*) AS total FROM likes WHERE sticker_id = ?',
        [stickerId]
      );

      await connection.commit();

      res.status(201).json({
        like: { userId: req.user.id, stickerId },
        stickerOwnerId: sticker.user_id,
        likesCount: countRows[0].total,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
}