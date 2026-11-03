<script setup lang="ts">
import { onScopeDispose, watch } from 'vue';
import Input from './Input.vue';
import { normalizeDateInput } from '@/lib/normalizeDateInput';

defineOptions({ inheritAttrs: false });
const props = defineProps<{ modelValue: string; disabled?: boolean; readonly?: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();
let timer: ReturnType<typeof setTimeout> | undefined;
let pending: string | undefined;
let composing = false;

function cancel() { clearTimeout(timer); timer = undefined; pending = undefined; }
function normalize(value: string) {
  if (props.disabled || props.readonly || composing || value !== props.modelValue) return;
  const formatted = normalizeDateInput(value);
  if (formatted !== value) emit('update:modelValue', formatted);
}
function schedule(value: string) {
  cancel();
  if (props.disabled || props.readonly || composing) return;
  pending = value;
  timer = setTimeout(() => { cancel(); normalize(value); }, 800);
}
function input(value: string) { if (props.disabled || props.readonly) return; emit('update:modelValue', value); schedule(value); }
function blur(event: FocusEvent) { cancel(); normalize(props.modelValue); emit('blur', event); }
function compositionStart() { composing = true; cancel(); }
function compositionEnd(event: CompositionEvent) { composing = false; schedule((event.target as HTMLInputElement).value); }
watch(() => props.modelValue, value => { if (pending !== undefined && value !== pending) cancel(); }, { flush: 'sync' });
watch(() => props.disabled || props.readonly, locked => { if (locked) cancel(); }, { flush: 'sync' });
onScopeDispose(cancel);
</script>

<template>
  <Input v-bind="$attrs" :model-value="modelValue" :disabled="disabled" :readonly="readonly" @update:model-value="input" @blur="blur" @focus="emit('focus', $event)" @compositionstart="compositionStart" @compositionend="compositionEnd" />
</template>
