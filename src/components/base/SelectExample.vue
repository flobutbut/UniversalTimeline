<template>
  <div class="select-example">
    <h2>Exemples d'utilisation du composant Select</h2>
    
    <div class="select-example__section">
      <h3>Sélection simple</h3>
      <BaseSelect
        v-model="singleValue"
        :options="options"
        label="Choisir un pays"
        placeholder="Sélectionner un pays"
        @change="handleSingleChange"
      />
      <p>Valeur sélectionnée : {{ singleValue }}</p>
    </div>

    <div class="select-example__section">
      <h3>Sélection multiple</h3>
      <BaseSelect
        v-model="multipleValues"
        :options="options"
        label="Choisir plusieurs pays"
        placeholder="Sélectionner des pays"
        :multiple="true"
        @change="handleMultipleChange"
      />
      <p>Valeurs sélectionnées : {{ multipleValues }}</p>
    </div>

    <div class="select-example__section">
      <h3>Sans recherche</h3>
      <BaseSelect
        v-model="noSearchValue"
        :options="options"
        label="Sans recherche"
        :searchable="false"
      />
    </div>

    <div class="select-example__section">
      <h3>Avec erreur</h3>
      <BaseSelect
        v-model="errorValue"
        :options="options"
        label="Avec erreur"
        error="Ce champ est requis"
        required
      />
    </div>

    <div class="select-example__section">
      <h3>Avec hint</h3>
      <BaseSelect
        v-model="hintValue"
        :options="options"
        label="Avec indication"
        hint="Sélectionnez votre pays de résidence"
      />
    </div>

    <div class="select-example__section">
      <h3>Désactivé</h3>
      <BaseSelect
        v-model="disabledValue"
        :options="options"
        label="Désactivé"
        :disabled="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BaseSelect from './Select.vue';

// Données d'exemple
const options = [
  { value: 'fr', label: 'France' },
  { value: 'us', label: 'États-Unis' },
  { value: 'ca', label: 'Canada' },
  { value: 'de', label: 'Allemagne' },
  { value: 'it', label: 'Italie' },
  { value: 'es', label: 'Espagne' },
  { value: 'uk', label: 'Royaume-Uni' },
  { value: 'jp', label: 'Japon' },
  { value: 'au', label: 'Australie' },
  { value: 'br', label: 'Brésil' },
  { value: 'in', label: 'Inde' },
  { value: 'cn', label: 'Chine' },
  { value: 'ru', label: 'Russie' },
  { value: 'mx', label: 'Mexique' },
  { value: 'kr', label: 'Corée du Sud' }
];

// Valeurs réactives
const singleValue = ref<string | null>(null);
const multipleValues = ref<(string | number)[]>([]);
const noSearchValue = ref<string | null>(null);
const errorValue = ref<string | null>(null);
const hintValue = ref<string | null>(null);
const disabledValue = ref<string | null>('fr');

// Handlers
const handleSingleChange = (value: string | number | (string | number)[] | null) => {
  console.log('Sélection simple changée:', value);
};

const handleMultipleChange = (value: string | number | (string | number)[] | null) => {
  console.log('Sélection multiple changée:', value);
};
</script>

<style scoped>
.select-example {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

.select-example h2 {
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
  font-size: var(--font-size-2xl);
}

.select-example__section {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.select-example__section h3 {
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-lg);
}

.select-example__section p {
  margin-top: var(--spacing-md);
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}
</style> 