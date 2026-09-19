import pool from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { deleteUploadedFile } from '../utils/files.js';

// GET /api/admin/users — liste des comptes (avec stats).
export async function listUsers(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.pseudo, u.email, u.role, u.avatar_url, u.team, u.xp, u.created_at,
              COUNT(s.id) AS sticker_count
       FROM users u
       LEFT JOIN stickers s ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json({
      users: rows.map((r) => ({
        id: r.id,
        pseudo: r.pseudo,
        email: r.email,
        role: r.role,
        avatarUrl: r.avatar_url,
        team: r.team,
        xp: r.xp,
        createdAt: r.created_at,
        stickerCount: Number(r.sticker_count),
      })),
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/admin/users/:id — promouvoir/rétrograder (role: 'user' | 'admin').
export async function updateUserRole(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError(400, 'Identifiant utilisateur invalide.');
    }

    const role = String(req.body?.role ?? '');
    if (role !== 'user' && role !== 'admin') {
      throw new HttpError(400, 'Rôle invalide (user ou admin attendus).');
    }

    if (userId === req.user.id && role !== 'admin') {
      throw new HttpError(400, "Un administrateur ne peut pas se rétrograder lui-même.");
    }

    const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Utilisateur introuvable.');
    }

    res.json({ message: `Rôle mis à jour -> ${role}.` });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/admin/users/:id — supprime le compte, ses stickers (fichiers
// compris, énumérés avant suppression) et ses likes (cascade).
export async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError(400, 'Identifiant utilisateur invalide.');
    }

    if (userId === req.user.id) {
      throw new HttpError(400, 'Un administrateur ne peut pas supprimer son propre compte.');
    }

    const [rows] = await pool.query(
      'SELECT id, avatar_url, photo_url FROM users LEFT JOIN stickers ON stickers.user_id = users.id WHERE users.id = ?',
      [userId]
    );
    if (rows.length === 0) {
      throw new HttpError(404, 'Utilisateur introuvable.');
    }

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    for (const row of rows) {
      if (row.photo_url) await deleteUploadedFile(row.photo_url);
    }
    if (rows[0]?.avatar_url) await deleteUploadedFile(rows[0].avatar_url);

    res.json({ message: 'Compte et contenus supprimés.', deletedUserId: userId });
  } catch (error) {
    next(error);
  }
}