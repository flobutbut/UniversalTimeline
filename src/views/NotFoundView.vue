<template>
  <section class="not-found">
    <h2>Page introuvable</h2>
    <p>Ce lien ne correspond à aucune page de l’application.</p>
    <RouterLink :to="{ name: 'timeline' }">Revenir à la timeline</RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.not-found {
  padding: var(--spacing-xl);
  color: var(--color-text-primary);
}
.not-found a { color: var(--color-text-link); }
</style>
