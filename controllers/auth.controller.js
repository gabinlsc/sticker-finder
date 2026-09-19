import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import {
  isValidEmail,
  isValidPseudo,
  isValidPassword,
} from '../utils/validators.js';
import { HttpError } from '../middleware/errorHandler.js';

const BCRYPT_ROUNDS = 10;

// Fabrique un JWT signé pour l'utilisateur identifié.
function signToken(user) {
  return jwt.sign(
    { id: user.id, pseudo: user.pseudo, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Génère une clé API unique. Elle donne droit à certains privilèges côté
// front (carte sans filigrane, etc.) et sert d'identifiant applicatif.
function generateApiKey() {
  return crypto.randomBytes(20).toString('hex');
}

// Masque les champs sensibles (password_hash, api_key) avant renvoi au client.
function publicUser(user) {
  return {
    id: user.id,
    pseudo: user.pseudo,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url,
    team: user.team,
    bio: user.bio,
    xp: user.xp,
    apiKey: user.api_key, // exposé uniquement à l'utilisateur lui-même
    createdAt: user.created_at,
  };
}

// Pseudo en minuscules pour éviter les doublons visuels façon "Boss"/"boss".
function normalizePseudo(value) {
  return String(value).trim(); // les pseudo restent sensibles à la casse pour l'affichage
}

// POST /api/auth/register
export async function register(req, res, next) {
  try {
    const { pseudo, email, password } = req.body ?? {};

    if (!pseudo || !email || !password) {
      throw new HttpError(400, 'Les champs pseudo, email et password sont obligatoires.');
    }

    const cleanPseudo = normalizePseudo(pseudo);
    const cleanEmail = String(email).trim().toLowerCase();

    if (!isValidPseudo(cleanPseudo)) {
      throw new HttpError(400, 'Le pseudo doit contenir 3 à 50 caractères (lettres, chiffres, underscores).');
    }
    if (!isValidEmail(cleanEmail)) {
      throw new HttpError(400, "Format d'adresse email invalide.");
    }
    if (!isValidPassword(password)) {
      throw new HttpError(400, 'Le mot de passe doit contenir entre 6 et 72 caractères.');
    }

    // Vérification d'unicité : pseudo OU email déjà présents en base.
    const [rows] = await pool.query(
      'SELECT id, pseudo, email FROM users WHERE pseudo = ? OR email = ? LIMIT 1',
      [cleanPseudo, cleanEmail]
    );

    if (rows.length > 0) {
      const existing = rows[0];
      if (existing.pseudo === cleanPseudo) {
        throw new HttpError(409, 'Ce pseudo est déjà utilisé.');
      }
      throw new HttpError(409, 'Cette adresse email est déjà utilisée.');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const apiKey = generateApiKey();

    const [result] = await pool.query(
      'INSERT INTO users (pseudo, email, password_hash, api_key) VALUES (?, ?, ?, ?)',
      [cleanPseudo, cleanEmail, passwordHash, apiKey]
    );

    // Auto-login : on renvoie immédiatement un token après inscription.
    const user = {
      id: result.insertId,
      pseudo: cleanPseudo,
      email: cleanEmail,
      role: 'user',
      avatar_url: null,
      team: null,
      bio: null,
      api_key: apiKey,
      xp: 0,
      created_at: new Date(),
    };

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/login — accepte un email OU un pseudo comme identifiant.
export async function login(req, res, next) {
  try {
    const { identifier, password } = req.body ?? {};

    if (!identifier || !password) {
      throw new HttpError(400, 'Les champs identifier et password sont obligatoires.');
    }

    const cleanIdentifier = String(identifier).trim();
    const isEmailLike = cleanIdentifier.includes('@');

    let rows;
    if (isEmailLike) {
      // On compare l'email en minuscules, comme stocké à l'inscription.
      const email = cleanIdentifier.toLowerCase();
      [rows] = await pool.query(
        'SELECT id, pseudo, email, password_hash, role, avatar_url, team, bio, api_key, xp, created_at FROM users WHERE email = ? LIMIT 1',
        [email]
      );
    } else {
      [rows] = await pool.query(
        'SELECT id, pseudo, email, password_hash, role, avatar_url, team, bio, api_key, xp, created_at FROM users WHERE pseudo = ? LIMIT 1',
        [cleanIdentifier]
      );
    }

    if (rows.length === 0) {
      throw new HttpError(401, 'Identifiants invalides.');
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      throw new HttpError(401, 'Identifiants invalides.');
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/me — profil de l'utilisateur connecté (JWT requis).
// Utile au front pour rafraîchir le pseudo et l'XP en temps réel.
export async function getMe(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, pseudo, email, role, avatar_url, team, bio, api_key, xp, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (rows.length === 0) {
      throw new HttpError(404, 'Utilisateur introuvable.');
    }

    res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    next(error);
  }
}