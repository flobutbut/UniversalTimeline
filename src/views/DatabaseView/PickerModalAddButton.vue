<script setup lang="ts">
import Button from '@/components/base/Button.vue';

defineProps<{ disabled: boolean }>();

const emit = defineEmits<{ (e: 'click'): void }>();
</script>

<template>
  <Button variant="primary" type="button" :disabled="disabled" @click="emit('click')">
    Ajouter
  </Button>
</template>
