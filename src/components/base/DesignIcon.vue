<template>
  <span aria-hidden="true" class="design-icon" :style="{ '--icon-source': `url(&quot;${asset}&quot;)`, width: `${dimensions[0]}px`, height: `${dimensions[1]}px` }" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
const assets = import.meta.glob<string>('../../assets/figma/frises/*.svg', { eager: true, query: '?url', import: 'default' });
const props = defineProps<{ name: 'timeline' | 'frises' | 'sun' | 'plus' | 'search' | 'filter' | 'event' | 'down' | 'remove' | 'chevron' | 'close' | 'account' | 'tab-close' | 'tag-close' | 'list' | 'star' | 'star-filled' }>();
const sizes: Record<typeof props.name, [number, number]> = {
  timeline: [11, 11], frises: [11, 11], sun: [18, 18], plus: [18, 18], search: [15, 15],
  filter: [18, 18], event: [8, 8], down: [20, 20], remove: [14, 14], chevron: [16, 16], close: [12, 12],
  account: [18, 18], 'tab-close': [16, 16], 'tag-close': [11, 11], list: [18, 18],
  star: [24, 24], 'star-filled': [24, 24],
};
const asset = computed(() => assets[`../../assets/figma/frises/${props.name}.svg`]);
const dimensions = computed(() => sizes[props.name]);
</script>

<style scoped>
.design-icon { display: inline-block; flex-shrink: 0; background: currentColor; mask: var(--icon-source) center / contain no-repeat; }
</style>
