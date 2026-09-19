import crypto from 'crypto';
import pool from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { deleteUploadedFile } from '../utils/files.js';

const TEAM_MAX_LENGTH = 50;
const BIO_MAX_LENGTH = 300;

// Projection d'une ligne user vers sa représentation publique (profil ouvert
// à tous au monde). On n'expose jamais email, api_key ni role admin complet.
function publicProfile(row, stats) {
  return {
    pseudo: row.pseudo,
    avatarUrl: row.avatar_url,
    team: row.team,
    bio: row.bio,
    xp: row.xp,
    role: row.role,
    createdAt: row.created_at,
    stickers: stats,
  };
}

// GET /api/users/:pseudo — profil public + stickers de l'utilisateur.
export async function getPublicProfile(req, res, next) {
  try {
    const pseudo = String(req.params.pseudo ?? '').trim();
    if (!pseudo) {
      throw new HttpError(400, 'Pseudo manquant.');
    }

    const [rows] = await pool.query(
      `SELECT id, pseudo, avatar_url, team, bio, xp, role, created_at
       FROM users WHERE pseudo = ? LIMIT 1`,
      [pseudo]
    );

    if (rows.length === 0) {
      throw new HttpError(404, 'Utilisateur introuvable.');
    }

    const user = rows[0];
    const [stickers] = await pool.query(
      `SELECT id, photo_url, lat, lng, description, created_at
       FROM stickers WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [user.id]
    );

    res.json({
      user: publicProfile(user, {
        count: stickers.length,
        items: stickers.map((s) => ({
          id: s.id,
          photoUrl: s.photo_url,
          lat: Number(s.lat),
          lng: Number(s.lng),
          description: s.description,
          createdAt: s.created_at,
        })),
      }),
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/users/me — l'utilisateur met à jour son équipe, sa bio (et son
// avatar si un fichier "avatar" accompagne la requête multipart).
export async function updateMe(req, res, next) {
  try {
    const fields = [];
    const values = [];

    if (req.body?.team !== undefined) {
      const team = req.body.team === '' ? null : String(req.body.team).trim();
      if (typeof team === 'string' && team.length > TEAM_MAX_LENGTH) {
        throw new HttpError(400, `Le nom d'équipe ne peut pas dépasser ${TEAM_MAX_LENGTH} caractères.`);
      }
      if (req.body.team === '' && req.file?.filename) {
        throw new HttpError(400, 'Impossible de combiner suppression du team et nouvel avatar.');
      }
      fields.push('team = ?');
      values.push(team);
    }

    if (req.body?.bio !== undefined) {
      const bio = req.body.bio === '' ? null : String(req.body.bio).trim();
      if (typeof bio === 'string' && bio.length > BIO_MAX_LENGTH) {
        throw new HttpError(400, `La bio ne peut pas dépasser ${BIO_MAX_LENGTH} caractères.`);
      }
      fields.push('bio = ?');
      values.push(bio);
    }

    if (req.file?.filename) {
      fields.push('avatar_url = ?');
      values.push(`/uploads/${req.file.filename}`);

      // Supprime l'ancien avatar remplacé pour ne pas laisser d'orchestre morte.
      const [oldRows] = await pool.query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
      if (oldRows[0]?.avatar_url) {
        await deleteUploadedFile(oldRows[0].avatar_url);
      }
    }

    if (fields.length === 0) {
      throw new HttpError(400, 'Aucun champ à mettre à jour (team, bio et/ou avatar).');
    }

    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [
      ...values,
      req.user.id,
    ]);

    const [rows] = await pool.query(
      'SELECT id, pseudo, email, role, avatar_url, team, bio, api_key, xp, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      user: {
        id: rows[0].id,
        pseudo: rows[0].pseudo,
        email: rows[0].email,
        role: rows[0].role,
        avatarUrl: rows[0].avatar_url,
        team: rows[0].team,
        bio: rows[0].bio,
        apiKey: rows[0].api_key,
        xp: rows[0].xp,
        createdAt: rows[0].created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/users/me/api-key — régénère la clé API de l'utilisateur.
export async function regenerateApiKey(req, res, next) {
  try {
    const apiKey = crypto.randomBytes(20).toString('hex');

    // Anti-collision théorique : en cas de doublon (improbable), on réessaie.
    const [dup] = await pool.query('SELECT id FROM users WHERE api_key = ?', [apiKey]);
    if (dup.length > 0) {
      throw new HttpError(500, 'Conflit de génération de clé, réessayez.');
    }

    await pool.query('UPDATE users SET api_key = ? WHERE id = ?', [apiKey, req.user.id]);
    res.json({ apiKey });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/users/me — l'utilisateur supprime son propre compte. Les
// stickers et likes partent en cascade (FK), les fichiers photos puis
// l'avatar sont effacés du disque.
export async function deleteMe(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      'SELECT photo_url FROM stickers WHERE user_id = ?',
      [userId]
    );
    const [userRows] = await pool.query(
      'SELECT avatar_url FROM users WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) {
      throw new HttpError(404, 'Utilisateur introuvable.');
    }

    // Supprime d'abord les stickers (files incluses), puis le compte :
    // la cascade cover les likes.
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    for (const row of rows) {
      if (row.photo_url) await deleteUploadedFile(row.photo_url);
    }
    if (userRows[0]?.avatar_url) await deleteUploadedFile(userRows[0].avatar_url);

    res.json({ message: 'Compte supprimé.' });
  } catch (error) {
    next(error);
  }
}