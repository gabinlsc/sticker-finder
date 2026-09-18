<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

function onLogout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <header class="sticky top-0 z-[1100] border-b border-gray-800 bg-gray-900/90 backdrop-blur">
    <nav class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
      <router-link to="/" class="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-50">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 text-base font-black text-gray-950">
          S
        </span>
        <span>Sticker<span class="text-lime-400">Finder</span></span>
      </router-link>

      <div class="flex items-center gap-3">
        <template v-if="auth.isAuthenticated">
          <div class="hidden text-right sm:block">
            <p class="text-sm font-semibold leading-tight">{{ auth.pseudo }}</p>
            <p class="text-xs leading-tight text-lime-400">{{ auth.xp }} XP</p>
          </div>
          <router-link
            to="/add"
            class="rounded-lg border border-lime-400/50 px-3 py-1.5 text-sm font-semibold text-lime-300 transition hover:bg-lime-400/10"
          >
            + Sticker
          </router-link>
          <button
            @click="onLogout"
            class="rounded-lg border border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-300 transition hover:border-red-500/60 hover:text-red-400"
          >
            Déconnexion
          </button>
        </template>
        <template v-else>
          <router-link
            to="/login"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-300 transition hover:text-white"
          >
            Connexion
          </router-link>
          <router-link
            to="/register"
            class="rounded-lg bg-lime-400 px-3 py-1.5 text-sm font-bold text-gray-950 transition hover:bg-lime-300"
          >
            S'inscrire
          </router-link>
        </template>
      </div>
    </nav>
  </header>
</template>