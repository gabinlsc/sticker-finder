// Fournisseurs de tuiles de carte partagés entre la carte publique et le
// formulaire d'ajout.
//
// CARTO exige désormais une clé API (gratuite, sans compte) : sans elle,
// ses tuiles sont couvertes d'un filigrane "API key required". Ajoutez la
// clé dans frontend/.env :
//   VITE_CARTO_API_KEY=votre-cle
// et elle sera injectée en paramètre "key" dans l'URL des tuiles.
// Carte du serveur : https://carto.com/basemaps/apikey
//
// À noter : l'attribution "© OpenStreetMap contributors / © CARTO" doit
// rester visible (conditions d'utilisation du service gratuit).
const cartoKey = import.meta.env?.VITE_CARTO_API_KEY || '';
const keyParam = cartoKey ? `?key=${encodeURIComponent(cartoKey)}` : '';

export const TILE_PROVIDERS = [
  {
    url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${keyParam}`,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
];