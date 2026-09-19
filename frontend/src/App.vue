<script setup>
import Navbar from './components/Navbar.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col bg-gray-950 text-gray-100">
    <Navbar />
    <main class="relative flex-1 overflow-hidden">
      <router-view />
    </main>
  </div>
</template>