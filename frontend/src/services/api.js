import axios from 'axios';

// Instance Axios partagée. En dev, /api et /uploads sont proxysés vers
// le back-end par le serveur Vite (voir vite.config.js).
const api = axios.create({
  baseURL: '/',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecte automatiquement le token JWT stocké dans le localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sur 401, purge la session et renvoie vers la page de connexion.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthCall) {
      localStorage.removeItem('sf.token');
      localStorage.removeItem('sf.user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;