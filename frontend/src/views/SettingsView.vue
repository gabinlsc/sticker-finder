<script setup>
import { onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const team = ref(auth.user?.team ?? '');
const bio = ref(auth.user?.bio ?? '');
const avatarFile = ref(null);
const avatarPreview = ref(auth.user?.avatarUrl ?? '');
const apiKey = ref(auth.user?.apiKey ?? '');

const saving = ref(false);
const message = ref('');
const errorMsg = ref('');

function handleAvatar(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  avatarFile.value = file;
  if (avatarPreview.value && !avatarPreview.value.startsWith('/uploads/')) {
    URL.revokeObjectURL(avatarPreview.value);
  }
  avatarPreview.value = URL.createObjectURL(file);
}

function showMessage(text, isError = false) {
  if (isError) errorMsg.value = text;
  else message.value = text;
  clearTimeout(message.closeTimeout);
  message.closeTimeout = setTimeout(() => {
    message.value = '';
    errorMsg.value = '';
  }, 3500);
}

async function saveProfile() {
  saving.value = true;
  errorMsg.value = '';
  try {
    const formData = new FormData();
    formData.append('team', team.value.trim());
    formData.append('bio', bio.value.trim());
    if (avatarFile.value) formData.append('avatar', avatarFile.value);

    const { data } = await api.patch('/api/users/me', formData);
    await auth.setSession({ token: auth.token, user: data.user });
    avatarFile.value = null;
    avatarPreview.value = data.user.avatarUrl ?? '';
    apiKey.value = data.user.apiKey ?? '';
    showMessage('Profil enregistré.');
  } catch (error) {
    showMessage(error.response?.data?.error || 'Échec de l’enregistrement.', true);
  } finally {
    saving.value = false;
  }
}

async function regenerateKey() {
  try {
    const { data } = await api.post('/api/users/me/api-key');
    apiKey.value = data.apiKey;
    showMessage('Nouvelle clé API générée.');
  } catch (error) {
    showMessage(error.response?.data?.error || 'Impossible de régénérer la clé.', true);
  }
}

async function deleteAccount() {
  if (!window.confirm('Supprimer définitivement votre compte, vos stickers et vos likes ?')) return;
  try {
    await api.delete('/api/users/me');
    auth.logout();
    router.push('/');
  } catch (error) {
    showMessage(error.response?.data?.error || 'Suppression impossible.', true);
  }
}

function resetFromSession() {
  team.value = auth.user?.team ?? '';
  bio.value = auth.user?.bio ?? '';
  avatarPreview.value = auth.user?.avatarUrl ?? '';
  apiKey.value = auth.user?.apiKey ?? '';
}

onBeforeUnmount(() => {
  if (avatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(avatarPreview.value);
  clearTimeout(message.closeTimeout);
});
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10">
    <h1 class="text-2xl font-extrabold tracking-tight">Paramètres</h1>
    <p class="mt-1 text-sm text-gray-400">Votre profil public : avatar, équipe, bio, clé API.</p>

    <div class="mt-6 space-y-6">
      <!-- Avatar -->
      <section class="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 class="text-sm font-bold uppercase tracking-wide text-gray-400">Photo de profil</h2>
        <label class="mt-4 flex cursor-pointer items-center gap-4">
          <img
            v-if="avatarPreview"
            :src="avatarPreview"
            alt="Aperçu de l'avatar"
            class="h-20 w-20 rounded-full border border-gray-700 bg-gray-800 object-cover"
          />
          <div
            v-else
            class="flex h-20 w-20 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-2xl font-black text-lime-400"
          >
            {{ (auth.user?.pseudo ?? '?').charAt(0).toUpperCase() }}
          </div>
          <span class="rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:border-lime-400/60 hover:text-lime-300">
            Choisir une image
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleAvatar" />
        </label>
      </section>

      <!-- Team + bio -->
      <section class="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 class="text-sm font-bold uppercase tracking-wide text-gray-400">Infos du profil</h2>
        <div class="mt-4 space-y-4">
          <div>
            <label for="team" class="mb-1 block text-sm font-semibold text-gray-300">Équipe / groupe</label>
            <input
              id="team"
              v-model="team"
              maxlength="50"
              placeholder="Ex. : Ultramarines, Brigade Sud..."
              class="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none transition focus:border-lime-400/70"
            />
          </div>
          <div>
            <label for="bio" class="mb-1 block text-sm font-semibold text-gray-300">Bio</label>
            <textarea
              id="bio"
              v-model="bio"
              rows="3"
              maxlength="300"
              placeholder="Quelques mots sur vous et votre collection..."
              class="w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none transition focus:border-lime-400/70"
            ></textarea>
            <p class="mt-1 text-right text-xs text-gray-500">{{ bio.length }}/300</p>
          </div>
        </div>
      </section>

      <p v-if="message" class="rounded-xl bg-lime-950/90 px-4 py-2 text-sm font-medium text-lime-200">
        {{ message }}
      </p>
      <p v-if="errorMsg" class="rounded-xl bg-red-950/80 px-4 py-2 text-sm text-red-300">
        {{ errorMsg }}
      </p>

      <button
        @click="saveProfile"
        :disabled="saving"
        class="w-full rounded-xl bg-lime-400 py-3 text-sm font-bold text-gray-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ saving ? 'Enregistrement...' : 'Enregistrer le profil' }}
      </button>

      <!-- Clé API -->
      <section class="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 class="text-sm font-bold uppercase tracking-wide text-gray-400">Clé API</h2>
        <div class="mt-3 flex items-center gap-3">
          <code class="flex-1 truncate rounded-lg bg-gray-950 px-3 py-2 text-xs text-lime-300">{{ apiKey }}</code>
          <button
            @click="regenerateKey"
            class="shrink-0 rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-lime-400/60 hover:text-lime-300"
          >
            Régénérer
          </button>
        </div>
        <p class="mt-2 text-xs text-gray-500">Identifiant applicatif (privilèges front). À garder privé.</p>
      </section>

      <!-- Zone dangereuse -->
      <section class="rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
        <h2 class="text-sm font-bold uppercase tracking-wide text-red-400">Zone dangereuse</h2>
        <p class="mt-2 text-sm text-red-200/80">
          Supprimer votre compte efface définitivement vos stickers, likes et votre profil.
        </p>
        <button
          @click="deleteAccount"
          class="mt-4 rounded-lg border border-red-500/60 px-4 py-2 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
        >
          Supprimer mon compte
        </button>
      </section>
    </div>
  </div>
</template>