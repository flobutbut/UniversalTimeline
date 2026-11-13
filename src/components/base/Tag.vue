<template>
  <span class="ui-tag" :class="[`ui-tag--${variant}`, `ui-tag--${size}`]">
    <slot name="label"><component v-if="to" :is="router ? RouterLink : 'a'" v-bind="router ? { to } : { href: plainHref }" class="ui-tag__label ui-tag__link">{{ uiText(label) }}</component>
    <span v-else class="ui-tag__label">{{ uiText(label) }}</span></slot>
    <button v-if="removable" type="button" class="ui-tag__remove" :disabled="disabled" :aria-label="uiText(removeLabel || uiFormat`Retirer ${label}`)" @click.stop="$emit('remove')" @keydown.stop>
      <DesignIcon name="tag-close" />
    </button>
  </span>
</template>
<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import { useLinkDestination } from '@/composables/useLinkDestination';
import DesignIcon from './DesignIcon.vue';
const props = withDefaults(defineProps<{ label: string; to?: RouteLocationRaw; removable?: boolean; removeLabel?: string; disabled?: boolean; variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'error'; size?: 'sm' | 'md' }>(), { variant: 'neutral', size: 'sm' });
const { router, plainHref } = useLinkDestination(() => props.to);
defineEmits<{ remove: [] }>();
</script>
<style scoped>
.ui-tag { display: inline-flex; flex-shrink: 0; align-items: center; gap: var(--spacing-xs); max-width: 100%; min-height: 24px; padding: 2px var(--spacing-sm); border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); background: var(--color-surface-default); color: var(--color-text-primary); font: var(--type-meta); }
.ui-tag--md { min-height: var(--field-height-md); padding-inline: var(--spacing-md); }
.ui-tag--accent { background: var(--color-interaction-selected); border-color: transparent; color: var(--color-text-on-selected); }
.ui-tag--success { background: var(--color-status-success-background); border-color: transparent; color: var(--color-status-success-foreground); }
.ui-tag--warning { background: var(--color-status-warning-background); border-color: transparent; color: var(--color-status-warning-foreground); }
.ui-tag--error { background: var(--color-status-error-background); border-color: transparent; color: var(--color-status-error-foreground); }
.ui-tag__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: inherit; }
.ui-tag__link { text-decoration: none; }
.ui-tag__link:hover { color: inherit; text-decoration: underline; }
.ui-tag__remove { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 24px; height: 24px; margin-block: -2px; border-radius: var(--radius-sm); color: inherit; }
.ui-tag__remove:hover:not(:disabled) { background: var(--color-interaction-hover); }
.ui-tag__remove:disabled { opacity: .5; cursor: not-allowed; }
.ui-tag__link:focus-visible, .ui-tag__remove:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 1px; }
</style>
