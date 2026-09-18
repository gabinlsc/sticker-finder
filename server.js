import 'dotenv/config';
import app from './app.js';
import { testConnection } from './config/db.js';

const PORT = Number(process.env.PORT) || 3000;

// Le serveur ne démarre que si la base de données répond, afin de
// détecter immédiatement un problème de configuration.
async function start() {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`[SERVER] Sticker Finder API démarrée sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`[SERVER] Démarrage impossible : ${error.message}`);
    console.error('[SERVER] Vérifiez la configuration MariaDB (.env) puis relancez.');
    process.exit(1);
  }
}

start();