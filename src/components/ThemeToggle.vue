<template>
  <Button
    variant="secondary"
    size="sm"
    iconOnly
    :title="isDark ? 'Passer au thème clair' : 'Passer au thème sombre'"
    :aria-label="isDark ? 'Passer au thème clair' : 'Passer au thème sombre'"
    @click="toggleTheme"
  >
    <template #icon>
      <DesignIcon v-if="isDark" name="sun" /><Icon v-else :icon="isDark ? 'mdi:white-balance-sunny' : 'mdi:weather-night'" width="18" height="18" aria-hidden="true" />
    </template>
  </Button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Button from '@/components/base/Button.vue';
import DesignIcon from '@/components/base/DesignIcon.vue';
import { Icon } from '@iconify/vue';
import {
  applyDocumentTheme,
  getStoredOrPreferredTheme,
  hasUserChosenTheme,
  type DocumentTheme,
} from '@/composables/useDocumentTheme';

const isDark = ref(false);

const setTheme = (theme: DocumentTheme) => {
  isDark.value = theme === 'dark';
  applyDocumentTheme(theme);
};

const toggleTheme = () => {
  setTheme(isDark.value ? 'light' : 'dark');
};

let mediaQuery: MediaQueryList | null = null;
const onSystemThemeChange = () => {
  if (hasUserChosenTheme() || !mediaQuery) return;
  setTheme(mediaQuery.matches ? 'dark' : 'light');
};

onMounted(() => {
  setTheme(getStoredOrPreferredTheme());
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', onSystemThemeChange);
  } else {
    mediaQuery.addListener(onSystemThemeChange);
  }
});

onUnmounted(() => {
  if (!mediaQuery) return;
  if (mediaQuery.removeEventListener) {
    mediaQuery.removeEventListener('change', onSystemThemeChange);
  } else {
    mediaQuery.removeListener(onSystemThemeChange);
  }
});
</script>
