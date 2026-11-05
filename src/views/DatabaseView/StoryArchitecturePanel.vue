<template>
  <div class="story-architecture">
    <p class="story-architecture__role">
      <span class="story-architecture__badge">{{ role.label }}</span>
      <span v-if="!story.isPublic && role.draft" class="story-architecture__visibility">
        <InfoTooltip label="Visibilité de cette frise"><template #trigger>Privé</template>Vous pouvez rendre cette frise publique dans les Propriétés, même sans frise parente.</InfoTooltip>
      </span>
      <span v-else class="story-architecture__badge story-architecture__badge--visibility">{{ story.isPublic ? 'Public' : 'Privé' }}</span>
      <span class="story-architecture__description">{{ role.description }}</span>
    </p>
    <details v-if="editable && issueCount" class="story-architecture__review">
      <summary>
        <Icon icon="mdi:alert-outline" width="16" height="16" aria-hidden="true" />
        <span class="story-architecture__heading">
          <span>{{ issueCount }} point{{ issueCount > 1 ? 's' : '' }} d’architecture à revoir</span>
          <span class="story-architecture__hint">Ces signalements ne bloquent rien : ils suivent les règles du guide de création des frises.</span>
        </span>
      </summary>
      <ul>
        <li v-for="warning in warnings" :key="`${warning.kind}:${warning.periodId ?? ''}:${warning.storyId ?? ''}`">{{ warning.message }}</li>
        <li v-for="candidate in promotions" :key="`promote:${candidate.periodId}`" class="story-architecture__promotion">
          <span>« {{ periodLabel(candidate.periodId) }} » remplit les critères d’une sous-frise : {{ candidate.reasons.join(', ') }}.</span>
          <Button v-if="canPromote" variant="tertiary" size="xs" :disabled="busy" @click="emit('promote', candidate.periodId)">Promouvoir en sous-frise</Button>
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import InfoTooltip from '@/components/base/InfoTooltip.vue';
import { deduceStoryRole, promotionCandidates, storyStructureWarnings } from '@/lib/storyArchitecture';
import type { Story, StorySummary } from '@/types/database';

const props = defineProps<{ story: Story; stories: StorySummary[]; editable?: boolean; canPromote?: boolean; busy?: boolean }>();
const emit = defineEmits<{ promote: [periodId: string] }>();
const role = computed(() => deduceStoryRole(props.story, props.stories));
const warnings = computed(() => storyStructureWarnings(props.story, props.stories));
const promotions = computed(() => promotionCandidates(props.story));
const issueCount = computed(() => warnings.value.length + promotions.value.length);
const periodLabel = (id: string) => {
  const period = props.story.periods.find(item => item.id === id);
  return period?.label.fr || period?.label.en || id;
};
</script>

<style scoped>
.story-architecture { display: flex; flex-direction: column; gap: var(--spacing-sm); margin-top: var(--spacing-sm); font: var(--type-compact); }
.story-architecture__role { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--spacing-xs) var(--spacing-sm); margin: 0; }
.story-architecture__badge { padding: 0 var(--spacing-sm); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); font-weight: var(--font-weight-semibold); }
.story-architecture__badge--visibility { color: var(--color-text-secondary); font-weight: normal; }
.story-architecture__visibility :deep(.base-button) { min-height:0; height:auto; padding:0; border-color:var(--color-border-default); border-radius:var(--radius-md); }
.story-architecture__description, .story-architecture__hint { color: var(--color-text-secondary); }
.story-architecture__review { border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: var(--spacing-sm) var(--spacing-md); max-width: 960px; }
.story-architecture__review summary { display: grid; grid-template-columns: 16px minmax(0, 1fr); align-items: start; column-gap: var(--spacing-sm); cursor: pointer; font-weight: var(--font-weight-semibold); }
.story-architecture__review summary > svg { margin-top: 2px; }
.story-architecture__heading { display: flex; flex-direction: column; gap: 0; }
.story-architecture__heading > span { margin: 0; padding: 0; font: var(--type-meta); }
.story-architecture__heading > span:first-child { font-weight: var(--font-weight-semibold); }
.story-architecture__review summary:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.story-architecture__hint { margin: 0; font-weight: var(--font-weight-normal); }
.story-architecture__review ul { margin: var(--spacing-sm) 0 0; padding-left: calc(16px + var(--spacing-sm)); list-style: none; display: flex; flex-direction: column; gap: var(--spacing-sm); line-height: var(--line-height-body); }
.story-architecture__promotion { overflow-wrap: anywhere; }
.story-architecture__promotion { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-xs) var(--spacing-sm); }
</style>
