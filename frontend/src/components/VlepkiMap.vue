<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useRouter } from 'vue-router';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';

const DEFAULT_CENTER = [48.8566, 2.3522];
const DEFAULT_ZOOM = 6;

const mapEl = ref(null);
const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const loadingError = ref('');
const message = ref('');
const likedStickerIds = ref(new Set());

let map = null;
const markers = new Set();

// Fix des icônes Leaflet par défaut avec Vite (les chemins d'assets
// ne sont pas résolus automatiquement dans les build bundlers).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Échappe toute valeur renvoyée par les utilisateurs avant insertion
// dans le HTML de la popup (anti-XSS).
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function popupContent(sticker) {
  const alreadyLiked = likedStickerIds.value.has(sticker.id);
  const description = sticker.description
    ? `<p class="mt-2 text-sm leading-snug text-gray-100">${escapeHtml(sticker.description)}</p>`
    : '<p class="mt-2 text-sm text-gray-400 italic">Aucune description</p>';
  const likeClasses = alreadyLiked
    ? 'mt-3 w-full cursor-not-allowed rounded-lg bg-gray-700 py-1.5 text-sm font-bold text-gray-400'
    : 'mt-3 w-full rounded-lg bg-lime-400 py-1.5 text-sm font-bold text-gray-950 transition hover:bg-lime-300';

  return `
    <div class="w-60">
      <img src="${escapeHtml(sticker.photoUrl)}" alt="Sticker" class="h-32 w-full rounded-lg object-cover" />
      ${description}
      <p class="mt-1 text-xs text-gray-400">par <span class="font-semibold text-lime-400">${escapeHtml(sticker.author.pseudo)}</span></p>
      <button data-like="${sticker.id}" class="${likeClasses}">
        ${alreadyLiked ? 'Sticker liké' : 'Liker'}
      </button>
    </div>
  `;
}

// À l'ouverture de la popup, attache le handler du bouton "Liker".
function onPopupOpen(sticker) {
  const button = document.querySelector(`[data-like="${sticker.id}"]`);
  if (button) {
    button.addEventListener('click', () => handleLike(sticker.id));
  }
}

async function handleLike(stickerId) {
  if (!auth.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    await api.post(`/api/stickers/${stickerId}/like`);
    likedStickerIds.value.add(stickerId);
    message.value = 'Sticker liké ! +10 XP pour son auteur.';
    await auth.fetchMe();
  } catch (error) {
    if (error.response?.status === 409) {
      likedStickerIds.value.add(stickerId);
      message.value = 'Vous avez déjà liké ce sticker.';
    } else {
      message.value = error.response?.data?.error || 'Impossible de liker ce sticker.';
    }
  } finally {
    message.closeTimeout = setTimeout(() => (message.value = ''), 3500);
  }
}

function addMarker(sticker) {
  const marker = L.marker([Number(sticker.lat), Number(sticker.lng)]);
  marker.bindPopup(popupContent(sticker), { closeButton: true, minWidth: 240 });
  marker.on('popupopen', () => onPopupOpen(sticker));
  marker.addTo(map);
  markers.add(marker);
}

async function loadStickers() {
  loading.value = true;
  loadingError.value = '';
  try {
    const { data } = await api.get('/api/stickers');
    (data.stickers ?? []).forEach(addMarker);
  } catch {
    loadingError.value = 'Impossible de charger les stickers. Vérifiez que l’API est démarrée.';
  } finally {
    loading.value = false;
  }
}

function centerOnUser() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      map.setView([position.coords.latitude, position.coords.longitude], 14);
    },
    () => {},
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

onMounted(async () => {
  map = L.map(mapEl.value, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  centerOnUser();
  await loadStickers();
});

onBeforeUnmount(() => {
  markers.forEach((marker) => marker.remove());
  markers.clear();
  map?.remove();
});
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="mapEl" class="absolute inset-0 z-0"></div>

    <div
      v-if="loading"
      class="absolute inset-0 z-[900] flex items-center justify-center bg-gray-950/60"
    >
      <p class="rounded-xl bg-gray-900/90 px-4 py-2 text-sm text-gray-200">
        Chargement des stickers...
      </p>
    </div>

    <div
      v-if="loadingError"
      class="absolute left-1/2 top-4 z-[900] -translate-x-1/2 rounded-xl bg-red-950/90 px-4 py-2 text-sm text-red-200 shadow-lg"
    >
      {{ loadingError }}
    </div>

    <div
      v-if="message"
      class="absolute left-1/2 top-4 z-[900] -translate-x-1/2 rounded-xl bg-lime-950/90 px-4 py-2 text-sm font-medium text-lime-200 shadow-lg"
    >
      {{ message }}
    </div>
  </div>
</template>