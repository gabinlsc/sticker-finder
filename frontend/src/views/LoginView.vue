<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const identifier = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

async function submit() {
  errorMsg.value = '';
  loading.value = true;
  try {
    await auth.login(identifier.value, password.value);
    const redirect = router.currentRoute.value.query?.redirect;
    router.push(typeof redirect === 'string' ? redirect : '/');
  } catch (error) {
    errorMsg.value = error.response?.data?.error || 'Connexion impossible.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
    <h1 class="text-2xl font-extrabold tracking-tight">Connexion</h1>
    <p class="mt-1 text-sm text-gray-400">Pseudo ou email + mot de passe.</p>

    <form @submit.prevent="submit" class="mt-6 space-y-4">
      <div>
        <label for="identifier" class="mb-1 block text-sm font-semibold text-gray-300">Pseudo ou email</label>
        <input
          id="identifier"
          v-model.trim="identifier"
          type="text"
          required
          autocomplete="username"
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
          autocomplete="current-password"
          class="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none transition focus:border-lime-400/70"
        />
      </div>

      <p v-if="errorMsg" class="rounded-xl bg-red-950/80 px-4 py-2 text-sm text-red-300">
        {{ errorMsg }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-xl bg-lime-400 py-3 text-sm font-bold text-gray-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>

      <p class="text-center text-sm text-gray-400">
        Pas encore de compte ?
        <router-link to="/register" class="font-semibold text-lime-400 hover:text-lime-300">Créer un compte</router-link>
      </p>
    </form>
  </div>
</template>