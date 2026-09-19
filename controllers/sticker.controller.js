import pool from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { deleteUploadedFile } from '../utils/files.js';

const XP_PER_STICKER = 50;
const DESCRIPTION_MAX_LENGTH = 500;

// Projection d'une ligne SQL vers un objet JSON public.
function serializeSticker(row) {
  return {
    id: row.id,
    photoUrl: row.photo_url,
    lat: Number(row.lat),
    lng: Number(row.lng),
    description: row.description,
    likes: Number(row.like_count || 0),
    createdAt: row.created_at,
    author: {
      id: row.user_id,
      pseudo: row.pseudo,
      avatarUrl: row.avatar_url || null,
    },
  };
}

// GET /api/stickers — route publique : consultation libre du flux.
export async function getStickers(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.photo_url, s.lat, s.lng, s.description, s.created_at,
              COUNT(l.user_id) AS like_count,
              u.id AS user_id, u.pseudo, u.avatar_url
       FROM stickers s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN likes l ON l.sticker_id = s.id
       GROUP BY s.id, s.photo_url, s.lat, s.lng, s.description, s.created_at,
                u.id, u.pseudo, u.avatar_url
       ORDER BY s.created_at DESC`,
      []
    );

    res.json({ stickers: rows.map(serializeSticker) });
  } catch (error) {
    next(error);
  }
}

// GET /api/stickers/top — classement des stickers les plus likés.
export async function getTopStickers(req, res, next) {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 12;

    const [rows] = await pool.query(
      `SELECT s.id, s.photo_url, s.lat, s.lng, s.description, s.created_at,
              COUNT(l.user_id) AS like_count,
              u.id AS user_id, u.pseudo
       FROM stickers s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN likes l ON l.sticker_id = s.id
       GROUP BY s.id, s.photo_url, s.lat, s.lng, s.description, s.created_at,
                u.id, u.pseudo
       ORDER BY like_count DESC, s.created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ stickers: rows.map(serializeSticker) });
  } catch (error) {
    next(error);
  }
}

// POST /api/stickers — route protégée, image via multer.
export async function createSticker(req, res, next) {
  try {
    // Multer expose le fichier dans req.file et les champs texte dans req.body.
    if (!req.file) {
      throw new HttpError(400, 'Une photo est requise (JPEG, PNG ou WEBP).');
    }

    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new HttpError(400, 'Coordonnée lat invalide (doit être entre -90 et 90).');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new HttpError(400, 'Coordonnée lng invalide (doit être entre -180 et 180).');
    }

    const rawDescription = req.body?.description;
    const description =
      typeof rawDescription === 'string' && rawDescription.trim()
        ? rawDescription.trim().slice(0, DESCRIPTION_MAX_LENGTH)
        : null;

    const photoUrl = `/uploads/${req.file.filename}`;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO stickers (user_id, photo_url, lat, lng, description)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, photoUrl, lat, lng, description]
      );

      // Règle métier : +50 XP pour l'auteur du sticker.
      await connection.query('UPDATE users SET xp = xp + ? WHERE id = ?', [
        XP_PER_STICKER,
        req.user.id,
      ]);

      const [userRows] = await connection.query(
        'SELECT xp FROM users WHERE id = ?',
        [req.user.id]
      );

      await connection.commit();

      const sticker = {
        id: result.insertId,
        photoUrl,
        lat,
        lng,
        description,
        createdAt: new Date(),
        author: { id: req.user.id, pseudo: req.user.pseudo },
      };

      res.status(201).json({
        sticker,
        xpEarned: XP_PER_STICKER,
        userXp: userRows[0]?.xp ?? 0,
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

// DELETE /api/stickers/:id — le créateur du sticker ou un administrateur.
// Supprime la ligne (les likes sont effacés en cascade) et le fichier photo.
export async function deleteSticker(req, res, next) {
  try {
    const stickerId = Number(req.params.id);
    if (!Number.isInteger(stickerId) || stickerId <= 0) {
      throw new HttpError(400, 'Identifiant de sticker invalide.');
    }

    const [rows] = await pool.query(
      'SELECT id, user_id, photo_url FROM stickers WHERE id = ?',
      [stickerId]
    );
    if (rows.length === 0) {
      throw new HttpError(404, 'Sticker introuvable.');
    }

    const sticker = rows[0];
    const isOwner = sticker.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new HttpError(403, 'Vous ne pouvez supprimer que vos propres stickers.');
    }

    await pool.query('DELETE FROM stickers WHERE id = ?', [stickerId]);
    await deleteUploadedFile(sticker.photo_url);

    res.json({
      deleted: stickerId,
      message: 'Sticker supprimé.',
    });
  } catch (error) {
    next(error);
  }
}