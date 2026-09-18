<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const imageFile = ref(null);
const previewUrl = ref('');
const description = ref('');
const coords = ref(null);
const geoStatus = ref('Localisation en cours...');
const submitting = ref(false);
const errorMsg = ref('');

function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  imageFile.value = file;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(file);
}

function requestLocation() {
  if (!navigator.geolocation) {
    geoStatus.value = 'Géolocalisation non supportée par le navigateur.';
    return;
  }

  geoStatus.value = 'Localisation en cours...';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      coords.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      geoStatus.value = 'Position détectée.';
    },
    (error) => {
      geoStatus.value = `Position refusée (${error.message}). Impossible de poster sans localisation.`;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

async function submit() {
  errorMsg.value = '';

  if (!imageFile.value) {
    errorMsg.value = 'Choisissez une photo du sticker.';
    return;
  }
  if (!coords.value) {
    errorMsg.value = "La géolocalisation est requise pour poster un sticker.";
    requestLocation();
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

onMounted(requestLocation);

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
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
            <span class="text-sm text-gray-400">jpg, png ou webp — max 5 Mo</span>
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
      <div class="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
        <div>
          <p class="text-sm font-semibold text-gray-300">Position GPS</p>
          <p class="text-xs text-gray-400">
            <template v-if="coords">
              Lat {{ coords.lat.toFixed(5) }} · Lng {{ coords.lng.toFixed(5) }}
            </template>
            <template v-else>{{ geoStatus }}</template>
          </p>
        </div>
        <button
          type="button"
          @click="requestLocation"
          class="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-lime-400/60 hover:text-lime-300"
        >
          Relocaliser
        </button>
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