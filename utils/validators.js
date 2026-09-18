// Validation des champs côté serveur (le front seul ne suffit jamais).
// Contraintes : pseudo 3-50 alnum + underscore, email classique,
// mot de passe 6-72 caractères (72 = limite de hachage bcrypt).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PSEUDO_REGEX = /^[a-zA-Z0-9_]{3,50}$/;

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim());
}

export function isValidPseudo(value) {
  return typeof value === 'string' && PSEUDO_REGEX.test(value.trim());
}

export function isValidPassword(value) {
  return (
    typeof value === 'string' &&
    value.length >= 6 &&
    value.length <= 72
  );
}