<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
<template>
  <section class="access-denied"><h2>Accès réservé</h2><p>Cette page est réservée à l’administrateur.</p><RouterLink to="/timeline">Revenir à la timeline</RouterLink></section>
</template>
<style scoped>
.access-denied { padding: var(--spacing-lg); overflow: auto; }
</style>
