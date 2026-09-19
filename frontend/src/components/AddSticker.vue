<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useRouter } from 'vue-router';
import api from '../services/api.js';
import { TILE_PROVIDERS } from '../services/tileProviders.js';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const DEFAULT_CENTER = [48.8566, 2.3522];
const DEFAULT_ZOOM = 13;

const imageFile = ref(null);
const previewUrl = ref('');
const description = ref('');
const coords = ref(null);
const geoStatus = ref('La localisation GPS n’est pas encore définie.');
const submitting = ref(false);
const errorMsg = ref('');

const mapEl = ref(null);
let map = null;
let tileLayer = null;
let tileProviderIndex = 0;
let placedMarker = null;
let stallTimeout = null;
let tileLoadedAny = false;

// Fix des icônes Leaflet par défaut avec Vite + chemin d'image vidé
// (sinon URL préfixée en double -> icône 404 invisible).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
L.Icon.Default.imagePath = '';

// Déplace (ou crée) le marqueur et enregistre les coordonnées choisies.
function placeAt(lat, lng, zoom) {
  coords.value = { lat, lng };
  if (placedMarker) {
    placedMarker.setLatLng([lat, lng]);
  } else {
    placedMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
    placedMarker.on('dragend', () => updateFromMarker());
  }
  if (zoom) map.setView([lat, lng], zoom);
}

function updateFromMarker() {
  const { lat, lng } = placedMarker.getLatLng();
  coords.value = { lat, lng };
  geoStatus.value = 'Position choisie sur la carte.';
}

function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  imageFile.value = file;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(file);
}

function requestLocation() {
  if (!navigator.geolocation) {
    geoStatus.value = 'Géolocalisation non supportée par le navigateur. Cliquez sur la carte.';
    return;
  }

  geoStatus.value = 'Localisation en cours...';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      placeAt(position.coords.latitude, position.coords.longitude, 15);
      geoStatus.value = 'Position GPS détectée — ajustable en cliquant sur la carte.';
    },
    (error) => {
      geoStatus.value = `Position GPS refusée (${error.message}). Cliquez sur la carte pour placer le sticker.`;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

// Charge les tuiles avec bascule automatique si le fournisseur ne répond pas.
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

  stallTimeout = setTimeout(() => {
    if (!tileLoadedAny) switchProvider();
  }, 8000);
}

async function submit() {
  errorMsg.value = '';

  if (!imageFile.value) {
    errorMsg.value = 'Choisissez une photo du sticker.';
    return;
  }
  if (!coords.value) {
    errorMsg.value = 'Placez le sticker sur la carte (clic) avant de publier.';
    return;
  }

  submitting.value = true;
  try {
    const formData = new FormData();
    formData.append('image', imageFile.value);
    formData.append('description', description.value);
    formData.append('lat', coords.value.lat);
    formData.append('lng', coords.value.lng);

    await api.post('/api/stickers', formData);
    await auth.fetchMe();
    router.push('/');
  } catch (error) {
    errorMsg.value = error.response?.data?.error || "Échec de l'envoi du sticker.";
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  map = L.map(mapEl.value, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    attributionControl: { position: 'bottomleft' },
  });
  requestAnimationFrame(() => map.invalidateSize());
  loadTileLayer();
  map.on('click', (e) => {
    placeAt(e.latlng.lat, e.latlng.lng);
    geoStatus.value = 'Position choisie sur la carte.';
  });
  requestLocation();
});

onBeforeUnmount(() => {
  clearTimeout(stallTimeout);
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  placedMarker?.remove();
  map?.remove();
});
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-10">
    <h1 class="text-2xl font-extrabold tracking-tight">Ajouter un sticker</h1>
    <p class="mt-1 text-sm text-gray-400">
      Géolocalisez-vous, photographiez un sticker collé dans la rue, et gagnez 50 XP.
    </p>

    <form @submit.prevent="submit" class="mt-6 space-y-6">
      <!-- Photo -->
      <div>
        <label class="mb-2 block text-sm font-semibold text-gray-300">Photo</label>
        <label
          class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-700 bg-gray-900 p-6 transition hover:border-lime-400/60"
        >
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="Aperçu du sticker"
            class="h-40 w-full rounded-lg object-cover"
          />
          <template v-else>
            <span class="text-3xl text-gray-600">+</span>
            <span class="text-sm text-gray-400">jpg, png ou webp — max 10 Mo</span>
          </template>
          <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleFile" />
        </label>
      </div>

      <!-- Description -->
      <div>
        <label for="description" class="mb-2 block text-sm font-semibold text-gray-300">Description</label>
        <textarea
          id="description"
          v-model="description"
          rows="3"
          maxlength="500"
          placeholder="Où l'as-tu trouvé ? Quel groupe ?"
          class="w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none transition focus:border-lime-400/70"
        ></textarea>
      </div>

      <!-- Position -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <label class="block text-sm font-semibold text-gray-300">Position sur la carte</label>
          <button
            type="button"
            @click="requestLocation"
            class="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-lime-400/60 hover:text-lime-300"
          >
            Me localiser
          </button>
        </div>
        <div
          ref="mapEl"
          class="h-64 w-full rounded-xl border border-gray-800 bg-gray-900"
        ></div>
        <p class="mt-2 text-xs text-gray-400">
          <template v-if="coords">
            Lat {{ coords.lat.toFixed(5) }} · Lng {{ coords.lng.toFixed(5) }} — cliquez sur la carte ou déplacez le marqueur.
          </template>
          <template v-else>{{ geoStatus }}</template>
        </p>
      </div>

      <p v-if="errorMsg" class="rounded-xl bg-red-950/80 px-4 py-2 text-sm text-red-300">
        {{ errorMsg }}
      </p>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full rounded-xl bg-lime-400 py-3 text-sm font-bold text-gray-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ submitting ? 'Publication en cours...' : 'Publier le sticker (+50 XP)' }}
      </button>
    </form>
  </div>
</template>