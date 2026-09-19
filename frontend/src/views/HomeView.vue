<script setup>
import { useAuthStore } from '../stores/auth.js';
import VlepkiMap from '../components/VlepkiMap.vue';

const auth = useAuthStore();
</script>

<template>
  <div class="absolute inset-0">
    <VlepkiMap />

    <router-link
      :to="auth.isAuthenticated ? '/add' : '/login'"
      class="absolute bottom-6 right-4 z-[1000] rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-gray-950 shadow-lg shadow-lime-400/20 transition hover:bg-lime-300"
    >
      {{ auth.isAuthenticated ? '+ Ajouter un sticker' : 'Se connecter pour poster' }}
    </router-link>
  </div>
</template>