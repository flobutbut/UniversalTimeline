<template>
  <section class="patterns-demo">
    <h1>Tags, messages et surfaces</h1>
    <p>Les mêmes composants portent les couleurs, les actions et les états dans les catalogues et les formulaires.</p>
    <h2>Tag</h2>
    <div class="examples">
      <Tag label="Géologie" variant="accent" />
      <Tag label="Frise liée" :to="{ name: 'timeline' }" />
      <Tag v-if="tagVisible" label="Catégorie retirable" size="md" removable @remove="tagVisible = false" />
      <Button v-else variant="tertiary" size="sm" @click="tagVisible = true">Rétablir le tag</Button>
      <Tag label="Retrait indisponible" removable disabled />
      <Tag label="Valide" variant="success" />
      <Tag label="À vérifier" variant="warning" />
      <Tag label="Erreur" variant="error" />
    </div>
    <h2>FeedbackState</h2>
    <FeedbackState kind="loading" message="Chargement du catalogue…" />
    <FeedbackState kind="error" :message="retryDone ? 'La nouvelle tentative a été déclenchée (démonstration).' : 'Le catalogue est momentanément indisponible.'" retryable @retry="retryDone = true" />
    <FeedbackState message="Aucune frise ne correspond aux filtres."><template #actions><Button variant="tertiary" size="sm" @click="showReset">Effacer les filtres</Button></template></FeedbackState>
    <h2>PopoverSurface</h2>
    <PopoverSurface padded class="surface-example"><strong>Surface partagée</strong><p>Menus, sélecteurs et résultats utilisent les mêmes fond, bordure, rayon et ombre.</p></PopoverSurface>
    <h2>Styles typographiques</h2>
    <div class="type-examples">
      <div v-for="role in roles" :key="role"><code>{{ role }}</code><span :style="{ font: `var(--type-${role})` }">De l’histoire de la Terre à votre prochaine frise</span></div>
    </div>
    <h2>Icônes du produit</h2>
    <p>DesignIcon fournit les SVG locaux du produit. Iconify / mdi complète les actions métier. Les icônes décoratives sont masquées aux technologies d’assistance.</p>
    <div class="examples"><span v-for="name in iconNames" :key="name" class="icon-example"><DesignIcon :name="name" />{{ name }}</span></div>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from '@/composables/useToast';
import Button from '@/components/base/Button.vue';
import Tag from '@/components/base/Tag.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import DesignIcon from '@/components/base/DesignIcon.vue';
const toast = useToast();
const showReset = () => toast.show('Filtres effacés — démonstration', 'info');
const tagVisible = ref(true);
const retryDone = ref(false);
const roles = ['body', 'compact', 'label', 'meta', 'micro', 'panel-title', 'action'];
const iconNames = ['timeline', 'frises', 'sun', 'plus', 'search', 'filter', 'event', 'down', 'remove', 'chevron', 'close', 'account', 'tab-close', 'tag-close', 'list'] as const;
</script>
<style scoped>
.patterns-demo { max-width: 960px; }
.patterns-demo h1 { font: var(--type-panel-title); }
.patterns-demo h2 { font: var(--type-panel-title); margin-top: var(--spacing-xl); }
.patterns-demo p { color: var(--color-text-secondary); }
.examples { display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing-md); }
.surface-example { max-width: 440px; }
.surface-example p { margin: var(--spacing-xs) 0 0; }
.type-examples { display: grid; gap: var(--spacing-lg); }
.type-examples > div { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--spacing-lg); }
.type-examples code { min-width: 110px; color: var(--color-text-secondary); }
.icon-example { display: inline-flex; align-items: center; gap: var(--spacing-sm); font: var(--type-meta); }
</style>
