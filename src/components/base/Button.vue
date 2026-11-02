<template>
  <!-- Avec `to`, une vraie navigation (clic milieu, ⌘-clic, annoncée comme lien) ; sinon un bouton. -->
  <component
    :is="isLink ? (router ? RouterLink : 'a') : 'button'"
    v-bind="isLink ? (router ? { to } : { href: plainHref }) : { disabled, type, 'aria-pressed': pressed === undefined ? undefined : pressed }"
    :class="[
      'base-button',
      `base-button--${variant}`,
      { 'base-button--icon-only': iconOnly },
      { 'base-button--sm': size === 'sm' },
      { 'base-button--xs': size === 'xs' },
      { 'base-button--disabled': disabled },
      { 'base-button--toggled': pressed }
    ]"
    @click="$emit('click', $event)"
  >
    <span v-if="$slots.icon" class="base-button__leading">
      <slot name="icon" />
    </span>
    <span v-if="!iconOnly" class="base-button__text">
      <slot></slot>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLinkDestination } from '@/composables/useLinkDestination';
import { RouterLink, type RouteLocationRaw } from 'vue-router';

interface Props {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  size?: 'md' | 'sm' | 'xs';
  iconOnly?: boolean;
  disabled?: boolean;
  pressed?: boolean;
  /** Destination interne : le bouton devient un lien (désactivé, il redevient un bouton inerte). */
  to?: RouteLocationRaw;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  size: 'md',
  iconOnly: false,
  disabled: false,
  pressed: undefined,
  to: undefined,
});
const isLink = computed(() => props.to !== undefined && !props.disabled);
const { router, plainHref } = useLinkDestination(() => props.to);

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();
</script>

<style scoped>
.base-button {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-sizing: border-box; gap: 0; padding: var(--spacing-sm); min-height: var(--field-height-lg);
  border: 1px solid transparent; border-radius: var(--radius-md);
  font: var(--type-action);
  text-decoration: none; cursor: pointer; transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}
.base-button__text { padding: 1px var(--spacing-sm); line-height: var(--line-height-small); white-space: nowrap; }
.base-button__leading { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
.base-button--primary { background: var(--color-action-primary-default); border-color: var(--color-action-primary-default); color: var(--color-text-on-accent); }
.base-button--primary:hover:not(:disabled) { background: var(--color-action-primary-hover); border-color: var(--color-action-primary-hover); }
.base-button--secondary { background: transparent; border-color: var(--color-border-focus); color: var(--color-text-link); }
.base-button--tertiary { background: transparent; border-color: var(--color-border-default); color: var(--color-text-primary); }
.base-button--ghost { background: transparent; color: var(--color-text-secondary); }
.base-button--secondary:hover:not(:disabled), .base-button--tertiary:hover:not(:disabled), .base-button--ghost:hover:not(:disabled) { background: var(--color-interaction-hover); }
.base-button--danger { background: var(--color-action-danger-default); border-color: var(--color-action-danger-default); color: var(--color-text-on-accent); }
.base-button--danger:hover:not(:disabled) { background: var(--color-action-danger-hover); border-color: var(--color-action-danger-hover); }
.base-button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.base-button--sm { min-height: var(--field-height-md); height: var(--field-height-md); font-size: var(--font-size-sm); }
.base-button--xs { min-height: var(--control-height-xs); height: var(--control-height-xs); padding: var(--spacing-xs); font-size: var(--font-size-sm); }
.base-button--xs .base-button__text { padding-inline: 6px; }
.base-button--icon-only { padding: 0; width: var(--field-height-lg); min-width: var(--field-height-lg); }
.base-button--sm.base-button--icon-only { width: var(--field-height-md); min-width: var(--field-height-md); }
.base-button--xs.base-button--icon-only { width: var(--control-height-xs); min-width: var(--control-height-xs); }
.base-button--toggled { background: var(--color-interaction-selected); border-color: var(--color-border-focus); color: var(--color-text-on-selected); }
.base-button--primary.base-button--toggled { background: var(--color-action-primary-pressed); border-color: var(--color-action-primary-pressed); color: var(--color-text-on-accent); }
.base-button--danger.base-button--toggled { background: var(--color-status-error-background); border-color: var(--color-status-error-foreground); color: var(--color-status-error-foreground); }
.base-button:disabled { background: var(--color-interaction-disabled); border-color: var(--color-border-default); color: var(--color-text-disabled); opacity: .5; cursor: not-allowed; }
</style>
