<template>
  <Toast :notification="ui.notification" />
  <ConfirmModal
    v-for="request in ui.confirmation ? [ui.confirmation] : []"
    :key="request.id"
    :title="request.title"
    :message="request.message"
    @confirm="ui.settleConfirmation(request.id, true)"
    @cancel="ui.settleConfirmation(request.id, false)"
  />
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue';
import Toast from './Toast.vue';
import ConfirmModal from './base/ConfirmModal.vue';
import { useUiStore } from '@/stores/useUiStore';
const ui = useUiStore();
onUnmounted(ui.reset);
</script>
