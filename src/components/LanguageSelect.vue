<script setup lang="ts">
import Select from '@/components/base/Select.vue';
import { language, setLanguage, uiText } from '@/i18n';
import type { SelectValue } from '@/lib/selectOptions';

defineProps<{ showLabel?: boolean }>();

const options = [{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }];

function chooseLanguage(value: SelectValue) {
  if (value === 'fr' || value === 'en') setLanguage(value);
}
</script>

<template>
  <Select :model-value="language" :options="options" compact :searchable="false"
    :label="showLabel ? uiText('Langue de l’interface') : undefined"
    :placeholder="uiText('Langue')" @update:model-value="chooseLanguage" />
</template>
