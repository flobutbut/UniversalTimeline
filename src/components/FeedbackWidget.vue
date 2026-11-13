<script setup lang="ts">
import { uiText } from "@/i18n";
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import Button from './base/Button.vue';
import FeedbackForm from './FeedbackForm.vue';
import CookieConsent from './CookieConsent.vue';
import { useFeedbackStore } from '@/stores/useFeedbackStore';
const feedback = useFeedbackStore();
const open = ref(false);
const root = ref<HTMLElement>();
let timer: ReturnType<typeof setInterval>;
const refresh = () => { if (!document.hidden) void feedback.refresh(); };
onMounted(() => {
  refresh();
  window.addEventListener('focus', refresh);
  timer = setInterval(refresh, 60_000);
});
onBeforeUnmount(() => { clearInterval(timer); window.removeEventListener('focus', refresh); });
watch(() => feedback.enabled, enabled => { if (!enabled) open.value = false; });
async function close() {
  open.value = false;
  await nextTick();
  root.value?.querySelector<HTMLButtonElement>('.feedback-widget__trigger')?.focus();
}
</script>

<template>
  <Teleport to="body">
    <div ref="root" class="feedback-widget">
      <CookieConsent v-show="!open" />
      <FeedbackForm v-if="feedback.enabled && open" @close="close" />
      <Button v-if="feedback.enabled" v-show="!open" class="feedback-widget__trigger" aria-haspopup="dialog" :aria-expanded="open" @click="open = true">
        <template #icon><Icon icon="mdi:message-text-outline" width="20" aria-hidden="true" /></template> {{ uiText("Donner mon avis") }} </Button>
    </div>
  </Teleport>
</template>

<style scoped>
.feedback-widget { position: fixed; right: max(var(--spacing-lg), env(safe-area-inset-right)); bottom: max(var(--spacing-lg), env(safe-area-inset-bottom)); z-index: var(--z-index-fixed); display: flex; flex-direction: column; align-items: flex-end; gap: var(--spacing-md); }
.feedback-widget :deep(.cookie-consent) { position: static; }
.feedback-widget__trigger { padding-inline: var(--spacing-lg); border-radius: var(--radius-pill); box-shadow: var(--shadow-lg); }
@media (max-width: 640px) { .feedback-widget { right: var(--spacing-sm); bottom: max(var(--spacing-sm), env(safe-area-inset-bottom)); } }
</style>
