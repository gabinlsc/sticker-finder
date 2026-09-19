import { defineStore } from 'pinia';
import api from '../services/api.js';

const TOKEN_KEY = 'sf.token';
const USER_KEY = 'sf.user';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || null,
    user: readStoredUser(),
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.role === 'admin',
    pseudo: (state) => state.user?.pseudo ?? '',
    xp: (state) => state.user?.xp ?? 0,
  },

  actions: {
    setSession({ token, user }) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    async login(identifier, password) {
      const { data } = await api.post('/api/auth/login', { identifier, password });
      this.setSession(data);
    },

    async register(pseudo, email, password) {
      const { data } = await api.post('/api/auth/register', { pseudo, email, password });
      this.setSession(data);
    },

    // Rafraîchit le profil (pseudo, XP) — appelé après post/like.
    async fetchMe() {
      if (!this.token) return;
      const { data } = await api.get('/api/auth/me');
      this.user = data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});