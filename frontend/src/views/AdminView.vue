<script setup>
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

const auth = useAuthStore();

const loading = ref(true);
const errorMsg = ref('');
const message = ref('');
const users = ref([]);
const search = ref('');

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(
    (u) => u.pseudo.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
});

async function loadUsers() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const { data } = await api.get('/api/admin/users');
    users.value = data.users ?? [];
  } catch (error) {
    errorMsg.value = error.response?.data?.error || 'Impossible de charger les comptes.';
  } finally {
    loading.value = false;
  }
}

function showMessage(text) {
  message.value = text;
  clearTimeout(message.closeTimeout);
  message.closeTimeout = setTimeout(() => (message.value = ''), 3500);
}

async function toggleRole(user) {
  const newRole = user.role === 'admin' ? 'user' : 'admin';
  try {
    await api.patch(`/api/admin/users/${user.id}/role`, { role: newRole });
    user.role = newRole;
    showMessage(`Rôle de ${user.pseudo} mis à jour (${newRole}).`);
  } catch (error) {
    showMessage(error.response?.data?.error || 'Mise à jour impossible.');
  }
}

async function removeUser(user) {
  if (!window.confirm(`Supprimer le compte de ${user.pseudo} ainsi que tous ses stickers ?`)) return;
  try {
    await api.delete(`/api/admin/users/${user.id}`);
    users.value = users.value.filter((u) => u.id !== user.id);
    showMessage(`Compte de ${user.pseudo} supprimé.`);
  } catch (error) {
    showMessage(error.response?.data?.error || 'Suppression impossible.');
  }
}

onMounted(loadUsers);
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10">
<div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight">Administration</h1>
          <p class="mt-1 text-sm text-gray-400">Gestion des comptes : rôles et suppression.</p>
        </div>
        <button
          @click="loadUsers"
          class="rounded-lg border border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-300 transition hover:border-lime-400/50 hover:text-lime-300"
        >
          Actualiser
        </button>
      </div>

      <input
        v-model="search"
        type="search"
        placeholder="Rechercher un pseudo ou un email..."
        class="mt-5 w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none transition placeholder:text-gray-600 focus:border-lime-400/70"
      />

    <p v-if="message" class="mt-4 rounded-xl bg-lime-950/90 px-4 py-2 text-sm font-medium text-lime-200">
      {{ message }}
    </p>
    <p v-if="errorMsg" class="mt-4 rounded-xl bg-red-950/90 px-4 py-2 text-sm text-red-300">
      {{ errorMsg }}
    </p>

    <div v-if="loading" class="mt-8 text-sm text-gray-400">Chargement des comptes...</div>

    <div v-else-if="filteredUsers.length === 0" class="mt-8 text-sm text-gray-400">
      Aucun compte{{ search ? ' ne correspond à la recherche' : '' }}.
    </div>

    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-gray-800">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
          <tr>
            <th class="px-4 py-3 font-semibold">Utilisateur</th>
            <th class="px-4 py-3 font-semibold">Rôle</th>
            <th class="px-4 py-3 text-center font-semibold">Stickers</th>
            <th class="px-4 py-3 text-center font-semibold">XP</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800">
          <tr v-for="user in filteredUsers" :key="user.id" class="bg-gray-950/40">
            <td class="px-4 py-3">
              <RouterLink
                :to="`/user/${encodeURIComponent(user.pseudo)}`"
                class="font-semibold text-gray-100 transition hover:text-lime-400 hover:underline"
              >
                {{ user.pseudo }}
              </RouterLink>
              <p class="text-xs text-gray-500">{{ user.email }}</p>
            </td>
            <td class="px-4 py-3">
              <span
                :class="user.role === 'admin' ? 'bg-lime-400/10 text-lime-300' : 'bg-gray-800 text-gray-300'"
                class="rounded-full px-2.5 py-1 text-xs font-bold"
              >
                {{ user.role }}
              </span>
            </td>
            <td class="px-4 py-3 text-center text-gray-300">{{ user.stickerCount }}</td>
            <td class="px-4 py-3 text-center text-gray-300">{{ user.xp }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="toggleRole(user)"
                  :disabled="user.id === auth.user?.id"
                  :title="user.id === auth.user?.id ? 'Impossible de se modifier soi-même' : ''"
                  class="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-lime-400/50 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {{ user.role === 'admin' ? 'Rétrograder' : 'Promouvoir' }}
                </button>
                <button
                  @click="removeUser(user)"
                  :disabled="user.id === auth.user?.id"
                  :title="user.id === auth.user?.id ? 'Impossible de se supprimer soi-même' : ''"
                  class="rounded-lg border border-gray-800 px-3 py-1.5 text-xs font-semibold text-red-400/80 transition hover:border-red-500/60 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>