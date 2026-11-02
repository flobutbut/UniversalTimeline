<template>
  <span class="user-avatar" :class="`user-avatar--${size}`" :style="{ background: `var(--color-avatar-${color})` }" aria-hidden="true">
    <Icon v-if="icon !== 'initial'" :icon="avatarIconNames[icon]" />
    <template v-else>{{ initial }}</template>
  </span>
</template>

<script lang="ts">
import type { AvatarIcon } from '@account-rules';
/** Iconify names of the avatar choices stored in the profile. */
export const avatarIconNames: Record<Exclude<AvatarIcon, 'initial'>, string> = {
  telescope: 'mdi:telescope', earth: 'mdi:earth', temple: 'mdi:pillar', dna: 'mdi:dna',
  rocket: 'mdi:rocket-launch-outline', book: 'mdi:book-open-variant', compass: 'mdi:compass-outline',
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { AvatarColor } from '@account-rules';

const props = withDefaults(defineProps<{ username?: string | null; color?: AvatarColor; icon?: AvatarIcon; size?: 'sm' | 'md' | 'lg' }>(), {
  username: null, color: 'blue', icon: 'initial', size: 'md',
});
const initial = computed(() => (props.username?.trim()[0] ?? '?').toLocaleUpperCase('fr'));
</script>

<style scoped>
.user-avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%;
  color: var(--color-avatar-foreground); font-weight: var(--font-weight-semibold); line-height: 1; user-select: none;
}
.user-avatar--sm { width: 24px; height: 24px; font-size: var(--font-size-xs); }
.user-avatar--md { width: 32px; height: 32px; font-size: var(--font-size-sm); }
.user-avatar--lg { width: 64px; height: 64px; font-size: var(--font-size-xl); }
.user-avatar--sm :deep(svg) { width: 14px; height: 14px; }
.user-avatar--md :deep(svg) { width: 18px; height: 18px; }
.user-avatar--lg :deep(svg) { width: 34px; height: 34px; }
</style>
