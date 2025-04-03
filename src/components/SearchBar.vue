<template>
  <div class="search-container">
    <div class="search-input-wrapper">
      <Search class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Rechercher une période ou un événement..."
        class="search-input"
        @focus="showResults = true"
        @blur="handleBlur"
      />
      <button
        v-if="searchQuery"
        class="reset-button"
        @click="handleReset"
        @mousedown.prevent
      >
        <X class="reset-icon" />
      </button>
    </div>

    <!-- Résultats de recherche -->
    <div v-if="showResults && searchResults.length > 0" class="search-results">
      <div
        v-for="result in searchResults"
        :key="result.id"
        class="result-item"
        @click="handleSelect(result)"
        @mouseenter="selectedIndex = searchResults.indexOf(result)"
        :class="{ 'selected': selectedIndex === searchResults.indexOf(result) }"
      >
        <div class="result-content">
          <div class="result-title">{{ result.label }}</div>
          <div class="result-metadata">{{ result.type }} • {{ result.id }}</div>
        </div>
        <div class="result-date">{{ formatDate(result.date) }}</div>
      </div>
    </div>

    <!-- État de chargement -->
    <div v-if="isSearching" class="loading-state">
      <Loader2 class="animate-spin" />
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Search, Loader2, X } from 'lucide-vue-next'
import { debounce } from 'lodash-es'
import { WikidataSearchService, type SearchResult } from '../services/WikidataSearchService'
import { DatabaseImportService } from '../services/DatabaseImportService'
import { DateFormatter } from '../utils/dateFormatter'

const searchService = WikidataSearchService.getInstance()
const importService = DatabaseImportService.getInstance()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const showResults = ref(false)
const error = ref<string | null>(null)
const selectedIndex = ref(-1)
const isSearching = ref(false)

const handleSearch = async () => {
  console.log('🔍 Début de la recherche dans le composant')
  if (!searchQuery.value.trim()) {
    console.log('❌ Requête vide, annulation')
    searchResults.value = []
    return
  }

  try {
    console.log('🔄 Démarrage de la recherche pour:', searchQuery.value)
    isSearching.value = true
    error.value = null
    searchResults.value = await searchService.search(searchQuery.value)
    console.log('✅ Résultats reçus:', searchResults.value.length)
  } catch (err) {
    console.error('❌ Erreur lors de la recherche:', err)
    error.value = 'Erreur lors de la recherche'
    searchResults.value = []
  } finally {
    console.log('🏁 Fin de la recherche')
    isSearching.value = false
  }
}

// Debounce la recherche
let searchTimeout: NodeJS.Timeout | null = null
watch(searchQuery, (newValue) => {
  console.log('📝 Changement de la requête:', newValue)
  if (searchTimeout) {
    console.log('⏱️ Annulation du timeout précédent')
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    console.log('⏱️ Déclenchement de la recherche après debounce')
    handleSearch()
  }, 300)
})

// Gestionnaire de sélection
const handleSelect = (result: SearchResult) => {
  searchQuery.value = result.label
  showResults.value = false
  selectedIndex.value = -1
}

// Gestionnaire de focus
const handleFocus = () => {
  showResults.value = true
}

// Gestionnaire de clic en dehors
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.search-input-wrapper')) {
    showResults.value = false
  }
}

// Gestionnaire de navigation au clavier
const handleKeyDown = (event: KeyboardEvent) => {
  if (!showResults.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (selectedIndex.value >= 0 && selectedIndex.value < searchResults.value.length) {
        handleSelect(searchResults.value[selectedIndex.value])
      }
      break
    case 'Escape':
      event.preventDefault()
      showResults.value = false
      selectedIndex.value = -1
      break
  }
}

// Gestionnaire de blur avec délai pour permettre le clic
const handleBlur = () => {
  setTimeout(() => {
    showResults.value = false
  }, 200)
}

// Formatage de la date
const formatDate = (date: string) => {
  return DateFormatter.format(date, 'geological')
}

// Gestionnaire de réinitialisation
const handleReset = () => {
  searchQuery.value = ''
  searchResults.value = []
  showResults.value = false
  selectedIndex.value = -1
}

// Nettoyage
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleClickOutside)
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>

<style scoped>
.search-container {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background-color: var(--color-surface);
  border-radius: 3px;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  transition: var(--transition-normal);
  height: 40px;
}

.search-input-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.search-icon {
  color: var(--color-text-light);
  margin-right: var(--spacing-sm);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-input {
  width: 100%;
  background: none;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: var(--font-size-base);
  height: 100%;
  display: flex;
  align-items: center;
}

.search-input::placeholder {
  color: var(--color-text-light);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--spacing-xs);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: var(--transition-fast);
  border-bottom: 1px solid var(--color-border-light);
  background-color: var(--color-background-bright);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover,
.result-item.selected {
  background-color: var(--color-background);
}

.result-content {
  flex: 1;
  min-width: 0;
  margin-right: var(--spacing-md);
}

.result-title {
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 2px;
}

.result-metadata {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-weight: normal;
  line-height: 1.2;
}

.result-date {
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  margin-top: 2px;
}

.loading-state {
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-message {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-error-light);
  color: var(--color-error);
  border-radius: 3px;
  font-size: var(--font-size-sm);
}

.reset-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-text-light);
  transition: var(--transition-fast);
  margin-left: var(--spacing-sm);
}

.reset-button:hover {
  color: var(--color-text);
}

.reset-icon {
  width: 16px;
  height: 16px;
}
</style> 