<template>
  <section class="not-found">
    <h2>{{ uiText("Page introuvable") }}</h2>
    <p>{{ uiText("Ce lien ne correspond à aucune page de l’application.") }}</p>
    <RouterLink :to="{ name: 'timeline' }">{{ uiText("Revenir à la timeline") }}</RouterLink>
  </section>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.not-found {
  padding: var(--spacing-xl);
  color: var(--color-text-primary);
}
.not-found a { color: var(--color-text-link); }
</style>
