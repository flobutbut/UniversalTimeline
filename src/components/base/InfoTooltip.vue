<template>
  <Button ref="trigger" variant="ghost" size="xs" :icon-only="!$slots.trigger" :aria-label="uiText(label)"
    :aria-describedby="open ? tooltipId : undefined"
    @mouseenter="enter" @mouseleave="leave" @focus="show" @blur="leave" @click="show">
    <template v-if="!$slots.trigger" #icon><Icon icon="mdi:information-outline" width="18" height="18" aria-hidden="true" /></template>
    <slot name="trigger" />
  </Button>
  <Teleport to="body">
    <PopoverSurface v-if="open" ref="surface" :id="tooltipId" role="tooltip" class="info-tooltip"
      :style="position" @mouseenter="enter" @mouseleave="leave">
      <slot />
    </PopoverSurface>
  </Teleport>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import { nextTick, onScopeDispose, ref, useId, watch, type CSSProperties } from 'vue';
import { Icon } from '@iconify/vue';
import Button from './Button.vue';
import PopoverSurface from './PopoverSurface.vue';

defineProps<{ label: string }>();
const tooltipId = `info-tooltip-${useId()}`;
const open = ref(false);
const trigger = ref<InstanceType<typeof Button> | null>(null);
const surface = ref<InstanceType<typeof PopoverSurface> | null>(null);
const position = ref<CSSProperties>({ visibility: 'hidden' });
let hovered = false;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
const triggerElement = () => trigger.value?.$el as HTMLElement | undefined;
const surfaceElement = () => surface.value?.$el as HTMLElement | undefined;

async function show() {
  clearTimeout(closeTimer);
  if (open.value) return;
  position.value = { visibility: 'hidden' };
  open.value = true;
  await nextTick();
  const anchor = triggerElement()?.getBoundingClientRect(), bounds = surfaceElement()?.getBoundingClientRect();
  if (!open.value || !anchor || !bounds) return;
  position.value = {
    visibility: 'visible',
    left: `${Math.max(12, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 12))}px`,
    top: `${Math.max(12, anchor.bottom + bounds.height + 8 <= window.innerHeight - 12 ? anchor.bottom + 8 : anchor.top - bounds.height - 8)}px`,
  };
}
function enter() { hovered = true; void show(); }
function leave() {
  hovered = false;
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => { if (!hovered && document.activeElement !== triggerElement()) close(); }, 150);
}
function close() { clearTimeout(closeTimer); open.value = false; }
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !triggerElement()?.contains(event.target) && !surfaceElement()?.contains(event.target)) close();
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
}
function onScroll(event: Event) { if (!(event.target instanceof Node) || !surfaceElement()?.contains(event.target)) close(); }
function removeListeners() {
  document.removeEventListener('pointerdown', outside, true);
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', close);
}
watch(open, value => {
  if (value) {
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
  } else removeListeners();
}, { flush: 'sync' });
onScopeDispose(() => { clearTimeout(closeTimer); removeListeners(); });
</script>

<style scoped>
.info-tooltip { position:fixed; z-index:var(--z-index-tooltip); box-sizing:border-box; width:max-content; max-width:min(320px, calc(100vw - 24px)); max-height:calc(100dvh - 24px); overflow-y:auto; overflow-wrap:anywhere; padding:var(--spacing-md); font:var(--type-meta); }
</style>
