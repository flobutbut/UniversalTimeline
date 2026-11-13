<script setup lang="ts">
import { uiText } from "@/i18n";
import { RouterLink } from 'vue-router';
</script>
<template>
  <section class="access-denied"><h2>{{ uiText("Accès réservé") }}</h2><p>{{ uiText("Cette page est réservée à l’administrateur.") }}</p><RouterLink to="/timeline">{{ uiText("Revenir à la timeline") }}</RouterLink></section>
</template>
<style scoped>
.access-denied { padding: var(--spacing-lg); overflow: auto; }
</style>
