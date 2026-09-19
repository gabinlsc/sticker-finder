<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api.js';

const router = useRouter();

const loading = ref(true);
const errorMsg = ref('');
const stickers = ref([]);

async function loadTop() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const { data } = await api.get('/api/stickers/top?limit=20');
    stickers.value = data.stickers ?? [];
  } catch {
    errorMsg.value = 'Impossible de charger le classement.';
  } finally {
    loading.value = false;
  }
}

// Clic sur un sticker : renvoie sur la carte, centrée sur la localisation.
function gotoMap(sticker) {
  router.push({
    name: 'home',
    query: {
      lat: sticker.lat,
      lng: sticker.lng,
      sticker: sticker.id,
      zoom: 15,
    },
  });
}

onMounted(loadTop);
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10">
    <h1 class="text-2xl font-extrabold tracking-tight">Classement</h1>
    <p class="mt-1 text-sm text-gray-400">Les stickers les plus likés de la communauté.</p>

    <p v-if="errorMsg" class="mt-4 rounded-xl bg-red-950/90 px-4 py-2 text-sm text-red-300">
      {{ errorMsg }}
    </p>

    <div v-if="loading" class="mt-8 text-sm text-gray-400">Chargement du classement...</div>

    <div v-else-if="stickers.length === 0" class="mt-8 text-sm text-gray-400">
      Aucun sticker liké pour le moment.
    </div>

    <div v-else class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      <div
        v-for="(sticker, index) in stickers"
        :key="sticker.id"
        class="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-lime-400/50"
      >
        <button
          type="button"
          @click="gotoMap(sticker)"
          class="relative block w-full cursor-pointer"
          :title="`Voir sur la carte — ${sticker.description || 'Sans description'}`"
        >
          <span class="absolute left-2 top-2 z-10 rounded-lg bg-gray-950/80 px-2 py-0.5 text-xs font-bold text-lime-300">
            #{{ index + 1 }}
          </span>
          <img
            :src="sticker.photoUrl"
            :alt="sticker.description || 'Sticker'"
            class="h-40 w-full object-cover transition group-hover:scale-105"
          />
        </button>
        <div class="px-3 py-2">
          <p class="line-clamp-1 text-xs text-gray-400">{{ sticker.description || 'Sans description' }}</p>
          <p class="mt-1 text-xs">
            <RouterLink
              :to="`/user/${encodeURIComponent(sticker.author.pseudo)}`"
              class="font-semibold text-lime-400 transition hover:text-lime-300 hover:underline"
            >
              {{ sticker.author.pseudo }}
            </RouterLink>
            <span class="ml-1 text-gray-500">· {{ sticker.likes }} like{{ sticker.likes > 1 ? 's' : '' }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>