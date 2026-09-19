<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api.js';
import { TILE_PROVIDERS } from '../services/tileProviders.js';
import { useAuthStore } from '../stores/auth.js';

const DEFAULT_CENTER = [48.8566, 2.3522];
const DEFAULT_ZOOM = 6;

const mapEl = ref(null);
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const loading = ref(true);
const loadingError = ref('');
const message = ref('');
const likedStickerIds = ref(new Set());

let map = null;
let tileLayer = null;
let tileProviderIndex = 0;
let stallTimeout = null;
let tileLoadedAny = false;
const markers = new Set();
const markerByStickerId = new Map();

// Fix des icônes Leaflet par défaut avec Vite (les chemins d'assets
// ne sont pas résolus automatiquement dans les build bundlers).
// imagePath: '' est indispensable : sans lui, Icon.Default préfixe le
// chemin importé avec son imagePath détecté -> URL doublée -> icône 404
// invisible sur la carte.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
// Vide le chemin auto-détecté par Icon.Default : sinon les URL ci-dessus
// sont préfixées en double (".../images//node_modules/leaflet/.../icon.png")
// et le marqueur devient invisible (image 404).
L.Icon.Default.imagePath = '';

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
  // L'URL de la photo est renvoyée par le serveur, jamais une saisie libre.
  const description = sticker.description
    ? `<p class="mt-2 max-h-24 overflow-y-auto break-words whitespace-pre-line text-sm leading-snug text-gray-100">${escapeHtml(sticker.description)}</p>`
    : '<p class="mt-2 text-sm text-gray-400 italic">Aucune description</p>';
  const likeClasses = alreadyLiked
    ? 'mt-3 w-full cursor-not-allowed rounded-lg bg-gray-700 py-1.5 text-sm font-bold text-gray-400'
    : 'mt-3 w-full rounded-lg bg-lime-400 py-1.5 text-sm font-bold text-gray-950 transition hover:bg-lime-300';
  const canDelete =
    auth.isAuthenticated && (auth.isAdmin || auth.user?.id === sticker.author.id);
  const deleteButton = canDelete
    ? `<button data-delete="${sticker.id}" class="mt-2 w-full rounded-lg border border-red-500/50 py-1.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10">
         Supprimer ce sticker
       </button>`
    : '';

  return `
    <div class="w-60">
      <img src="${escapeHtml(sticker.photoUrl)}" alt="Sticker" class="h-32 w-full rounded-lg object-cover" />
      ${description}
      <p class="mt-1 text-xs text-gray-400">
        par
        <button
          data-profile="${escapeHtml(sticker.author.pseudo)}"
          class="cursor-pointer font-semibold text-lime-400 transition hover:text-lime-300 hover:underline"
        >
          ${escapeHtml(sticker.author.pseudo)}
        </button>
      </p>
      <button data-like="${sticker.id}" class="${likeClasses}">
        ${alreadyLiked ? 'Sticker liké' : 'Liker'}
      </button>
      ${deleteButton}
    </div>
  `;
}

// À l'ouverture de la popup, attache les handlers des boutons.
function onPopupOpen(sticker) {
  const likeButton = document.querySelector(`[data-like="${sticker.id}"]`);
  if (likeButton) {
    likeButton.addEventListener('click', () => handleLike(sticker.id));
  }
  const deleteButton = document.querySelector(`[data-delete="${sticker.id}"]`);
  if (deleteButton) {
    deleteButton.addEventListener('click', () => handleDeleteSticker(sticker.id));
  }
  const profileButton = document.querySelector(`[data-profile="${sticker.author.pseudo}"]`);
  if (profileButton) {
    profileButton.addEventListener('click', () => {
      router.push(`/user/${encodeURIComponent(sticker.author.pseudo)}`);
    });
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
    flashMessage();
  }
}

async function handleDeleteSticker(stickerId) {
  if (!window.confirm('Supprimer définitivement ce sticker ?')) return;

  try {
    await api.delete(`/api/stickers/${stickerId}`);
    const marker = markerByStickerId.get(stickerId);
    if (marker) {
      marker.remove();
      markers.delete(marker);
      markerByStickerId.delete(stickerId);
    }
    message.value = 'Sticker supprimé.';
  } catch (error) {
    message.value = error.response?.data?.error || 'Impossible de supprimer ce sticker.';
  } finally {
    flashMessage();
  }
}

function flashMessage() {
  clearTimeout(message.closeTimeout);
  message.closeTimeout = setTimeout(() => (message.value = ''), 3500);
}

function addMarker(sticker) {
  const marker = L.marker([Number(sticker.lat), Number(sticker.lng)]);
  // Contenu généré à chaque ouverture : l'état de connexion/rôle et les
  // likes sont donc toujours à jour (bouton "Supprimer" pour admin,
  // "Liker" -> "Sticker liké", etc.).
  marker.bindPopup(() => popupContent(sticker), { closeButton: true, minWidth: 240 });
  marker.on('popupopen', () => onPopupOpen(sticker));
  marker.addTo(map);
  markers.add(marker);
  markerByStickerId.set(sticker.id, marker);
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

// Focus un sticker depuis la query (?lat=&lng=&sticker=&zoom=) venue du
// portfolio : centre la carte et ouvre la popup du marqueur correspondant.
function focusSticker(query) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  map.setView([lat, lng], Number(query.zoom) || 15);

  const stickerId = Number(query.sticker);
  if (Number.isInteger(stickerId) && stickerId > 0) {
    const marker = markerByStickerId.get(stickerId);
    if (marker) setTimeout(() => marker.openPopup(), 150);
  }
}

// Charge le fournisseur de tuiles courant et bascule sur le suivant si
// ses tuiles sont barrées (erreur réseau) OU si aucune tuile ne s'est
// chargée pendant un certain temps (blocage silencieux côté proxy/adblock).
function loadTileLayer() {
  const provider = TILE_PROVIDERS[tileProviderIndex];
  tileLoadedAny = false;

  let switched = false;
  const switchProvider = () => {
    if (switched || tileProviderIndex >= TILE_PROVIDERS.length - 1) return;
    switched = true;
    clearTimeout(stallTimeout);
    map.removeLayer(tileLayer);
    tileProviderIndex += 1;
    loadTileLayer();
  };

  tileLayer = L.tileLayer(provider.url, {
    attribution: provider.attribution,
    subdomains: provider.subdomains,
    maxZoom: provider.maxZoom,
  });

  tileLayer.on('error', switchProvider);
  tileLayer.on('tileerror', switchProvider);
  tileLayer.on('tileload', () => {
    tileLoadedAny = true;
    clearTimeout(stallTimeout);
  });

  tileLayer.addTo(map);

  // Filet de sécurité : aucune tuile chargée après 8 s ? Fournisseur suivant.
  stallTimeout = setTimeout(() => {
    if (!tileLoadedAny) switchProvider();
  }, 8000);
}

onMounted(async () => {
  map = L.map(mapEl.value, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    attributionControl: { position: 'bottomleft' },
  });

  // Recalcule les dimensions au premier rendu : évite une carte de
  // hauteur nulle si la mise en page du conteneur n'est pas terminée.
  requestAnimationFrame(() => map.invalidateSize());
  window.addEventListener('resize', onResize);

  loadTileLayer();

  if (!route.query.lat && !route.query.lng) centerOnUser();
  await loadStickers();
  focusSticker(route.query);
});

// Si l'utilisateur clique sur un sticker du portfolio alors qu'il est déjà
// sur la carte, la query change : on recentre sans recréer la carte.
watch(
  () => route.query,
  (query) => focusSticker(query)
);

function onResize() {
  map?.invalidateSize();
}

onBeforeUnmount(() => {
  clearTimeout(stallTimeout);
  window.removeEventListener('resize', onResize);
  markers.forEach((marker) => marker.remove());
  markers.clear();
  markerByStickerId.clear();
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