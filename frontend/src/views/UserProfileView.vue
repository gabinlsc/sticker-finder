<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api.js';

const route = useRoute();

const loading = ref(true);
const notFound = ref(false);
const user = ref(null);

async function loadProfile(pseudo) {
  loading.value = true;
  notFound.value = false;
  user.value = null;
  try {
    const { data } = await api.get(`/api/users/${encodeURIComponent(pseudo)}`);
    user.value = data.user;
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

watch(
  () => route.params.pseudo,
  (pseudo) => {
    if (pseudo) loadProfile(pseudo);
  },
  { immediate: true }
);
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10">
    <p v-if="loading" class="text-sm text-gray-400">Chargement du profil...</p>

    <div v-else-if="notFound" class="rounded-xl border border-gray-800 bg-gray-900 px-6 py-8 text-center">
      <p class="text-lg font-bold text-gray-200">Utilisateur introuvable</p>
      <p class="mt-1 text-sm text-gray-400">
        <RouterLink to="/" class="font-semibold text-lime-400 hover:text-lime-300">Retour à la carte</RouterLink>
      </p>
    </div>

    <template v-else-if="user">
      <!-- En-tête du profil -->
      <div class="flex flex-col items-center gap-5 rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:flex-row sm:items-start">
        <img
          v-if="user.avatarUrl"
          :src="user.avatarUrl"
          alt="Photo de profil"
          class="h-24 w-24 rounded-full border border-gray-700 bg-gray-800 object-cover"
        />
        <div v-else class="flex h-24 w-24 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-3xl font-black text-lime-400">
          {{ user.pseudo.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 text-center sm:text-left">
          <h1 class="text-2xl font-extrabold tracking-tight">{{ user.pseudo }}</h1>
          <div class="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span class="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
              {{ user.xp }} XP
            </span>
            <span
              v-if="user.team"
              class="rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300"
            >
              {{ user.team }}
            </span>
            <span
              v-if="user.role === 'admin'"
              class="rounded-full bg-lime-400/20 px-3 py-1 text-xs font-bold text-lime-200"
            >
              Admin
            </span>
          </div>
          <p v-if="user.bio" class="mt-3 text-sm leading-relaxed text-gray-300">{{ user.bio }}</p>
          <p class="mt-3 text-xs text-gray-500">
            Membre depuis le {{ formatDate(user.createdAt) }} · {{ user.stickers.count }} sticker{{ user.stickers.count > 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <!-- Portfolio -->
      <h2 class="mt-10 text-lg font-bold text-gray-100">Portfolio de stickers</h2>
      <div v-if="user.stickers.count === 0" class="mt-4 rounded-xl border border-dashed border-gray-800 py-10 text-center text-sm text-gray-500">
        Aucun sticker publié pour le moment.
      </div>
      <div v-else class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <div
          v-for="sticker in user.stickers.items"
          :key="sticker.id"
          class="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
        >
          <img
            :src="sticker.photoUrl"
            :alt="sticker.description || 'Sticker'"
            class="h-40 w-full object-cover transition group-hover:scale-105"
          />
          <div class="px-3 py-2">
            <p class="line-clamp-1 text-xs text-gray-400">{{ sticker.description || 'Sans description' }}</p>
            <p class="mt-1 text-[10px] text-gray-600">{{ formatDate(sticker.createdAt) }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>