<template>
  <span class="thematic-tags">
    <Tag v-for="(tag, index) in tags" :key="tag.id" :label="uiText(tagLabel(tag))" :class="{ 'thematic-tags__primary': index === 0 }" :style="index === 0 ? { '--tag-color': `var(--tag-${tag.id})` } : undefined" />
  </span>
</template>
<script setup lang="ts">
import { uiText } from "@/i18n";
import Tag from '@/components/base/Tag.vue';
import { tagLabel } from '@/lib/tags';
import type { TagRef } from '@/types/database';
defineProps<{ tags: readonly TagRef[] }>();
</script>
<style scoped>
.thematic-tags { display: contents; }
/* Seul le tag principal porte la couleur du domaine. */
.thematic-tags .thematic-tags__primary { background: color-mix(in srgb, var(--tag-color) 20%, var(--color-surface-default)); border-color: var(--tag-color); color: var(--color-text-primary); }
</style>
