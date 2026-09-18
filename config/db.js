import mysql from 'mysql2/promise';
import 'dotenv/config';

// Pool de connexions MySQL/MariaDB : les connexions sont créées
// paresseusement et réutilisées, ce qui évite l'overflow sur les requêtes.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sticker_finder',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Garde-fou : si un souci réseau survient au niveau du pool,
// on le log au lieu de laisser le processus crasher silencieusement.
pool.on('error', (err) => {
  console.error('[DB] Erreur du pool de connexions :', err.message);
});

// Utilitaire de démarrage : vérifie que la base est joignable.
export async function testConnection() {
  await pool.query('SELECT 1');
  console.log('[DB] Connexion à MariaDB établie avec succès.');
}

export default pool;