<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const pseudo = ref('');
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

async function submit() {
  errorMsg.value = '';
  loading.value = true;
  try {
    await auth.register(pseudo.value, email.value, password.value);
    router.push('/');
  } catch (error) {
    errorMsg.value = error.response?.data?.error || "Inscription impossible.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
    <h1 class="text-2xl font-extrabold tracking-tight">Inscription</h1>
    <p class="mt-1 text-sm text-gray-400">Créez un compte et rejoignez la carte des vlepki.</p>

    <form @submit.prevent="submit" class="mt-6 space-y-4">
      <div>
        <label for="pseudo" class="mb-1 block text-sm font-semibold text-gray-300">Pseudo</label>
        <input
          id="pseudo"
          v-model.trim="pseudo"
          type="text"
          required
          minlength="3"
          maxlength="50"
          autocomplete="username"
          class="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none transition focus:border-lime-400/70"
        />
      </div>

      <div>
        <label for="email" class="mb-1 block text-sm font-semibold text-gray-300">Email</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none transition focus:border-lime-400/70"
        />
      </div>

      <div>
        <label for="password" class="mb-1 block text-sm font-semibold text-gray-300">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
          class="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none transition focus:border-lime-400/70"
        />
        <p class="mt-1 text-xs text-gray-500">6 caractères minimum.</p>
      </div>

      <p v-if="errorMsg" class="rounded-xl bg-red-950/80 px-4 py-2 text-sm text-red-300">
        {{ errorMsg }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-xl bg-lime-400 py-3 text-sm font-bold text-gray-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ loading ? 'Création du compte...' : "S'inscrire" }}
      </button>

      <p class="text-center text-sm text-gray-400">
        Déjà un compte ?
        <router-link to="/login" class="font-semibold text-lime-400 hover:text-lime-300">Se connecter</router-link>
      </p>
    </form>
  </div>
</template>