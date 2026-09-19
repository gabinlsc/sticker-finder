// Promotion d'un compte existant au rôle admin.
// Usage : npm run make-admin -- <pseudo|email>
import pool from '../config/db.js';

async function main() {
  const identifier = (process.argv[2] ?? '').trim();
  if (!identifier) {
    console.error('Usage : npm run make-admin -- <pseudo|email>');
    process.exit(1);
  }

  const [rows] = await pool.query(
    'SELECT id, pseudo, email, role FROM users WHERE pseudo = ? OR email = ? LIMIT 1',
    [identifier, identifier]
  );

  if (rows.length === 0) {
    console.error(`Aucun compte trouvé pour "${identifier}".`);
    console.error('Créez d’abord un compte via le formulaire d’inscription, puis relancez.');
    process.exit(1);
  }

  const user = rows[0];
  await pool.query('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
  console.log(`OK : "${user.pseudo}" (${user.email}) est maintenant administrateur.`);
  console.log('Connectez-vous ensuite sur le site avec ce compte pour accéder à /admin.');
}

main().finally(() => pool.end());