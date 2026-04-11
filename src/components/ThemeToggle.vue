<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    :title="isDark ? 'Passer au thème clair' : 'Passer au thème sombre'"
  >
    <svg
      v-if="isDark"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
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

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--spacing-sm) * 5);
  height: calc(var(--spacing-sm) * 5);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background-color: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.theme-toggle:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}
</style> 