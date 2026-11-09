<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { RouterLink } from 'vue-router';
import Button from './base/Button.vue';
import Input from './base/Input.vue';
import Select from './base/Select.vue';
import DesignIcon from './base/DesignIcon.vue';
import FeedbackState from './base/FeedbackState.vue';
import PopoverSurface from './base/PopoverSurface.vue';
import { elementRef } from '@/utils/elementRef';
import { useDialog } from '@/composables/useDialog';
import { feedbackSubjects, feedbackPageUrl, type FeedbackSubmission, type FeedbackSubject } from '../../server/src/shared/feedback';
import { feedbackApi } from '@/services/FeedbackApiService';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';

const emit = defineEmits<{ close: [] }>();
const surfaceElement = ref<HTMLElement | null>(null);
const setSurface = elementRef(surfaceElement);
const panel = computed(() => surfaceElement.value ?? undefined);
const busy = ref(false), error = ref(''), step = ref<'form' | 'email' | 'done'>('form');
const rating = ref<number | null>(null), subject = ref<FeedbackSubject | null>(null), message = ref(''), email = ref('');
const { dialogId } = useDialog(panel, { close: () => emit('close'), busy: () => busy.value });
const placeholder = computed(() => feedbackSubjects.find(item => item.value === subject.value)?.placeholder ?? 'Une frise à ajouter, une information à corriger, une idée…');
let submission: FeedbackSubmission | undefined;
async function submit() {
  if (busy.value || !subject.value || !message.value.trim()) return;
  busy.value = true; error.value = '';
  try {
    // Keep the exact payload and receipt on retry: an interrupted response must not duplicate a return.
    submission ??= { id: crypto.randomUUID(), token: crypto.randomUUID(), rating: rating.value, subject: subject.value, message: message.value.trim(), pageUrl: feedbackPageUrl(window.location.href) };
    await feedbackApi.submit(submission);
    step.value = 'email';
  } catch (cause) { error.value = mutationErrorMessage(cause, 'Envoi impossible. Votre message est conservé ici, vous pouvez réessayer.'); }
  finally { busy.value = false; }
}
async function saveEmail() {
  if (busy.value || !submission) return;
  busy.value = true; error.value = '';
  try { await feedbackApi.addEmail(submission.id, submission.token, email.value.trim()); step.value = 'done'; }
  catch (cause) { error.value = mutationErrorMessage(cause, 'Votre retour est enregistré, mais l’adresse n’a pas pu être ajoutée. Réessayez.'); }
  finally { busy.value = false; }
}
</script>

<template>
  <PopoverSurface :ref="setSurface" class="feedback-form" role="dialog" aria-modal="true" :aria-labelledby="`${dialogId}-title`" :aria-busy="busy" tabindex="-1">
    <header class="feedback-form__header">
      <div><h2 :id="`${dialogId}-title`">Votre avis compte</h2><p>Aidez-nous à améliorer Universal Timeline.</p></div>
      <Button variant="ghost" icon-only :disabled="busy" aria-label="Fermer le formulaire" @click="emit('close')"><template #icon><Icon icon="mdi:close" width="20" aria-hidden="true" /></template></Button>
    </header>
    <form v-if="step === 'form'" class="feedback-form__body" @submit.prevent="submit">
      <fieldset class="feedback-form__rating" :disabled="busy || !!submission">
        <legend>Comment trouvez-vous l’expérience ?</legend>
        <div class="feedback-form__stars">
          <label v-for="star in 5" :key="star" :class="{ 'feedback-form__star--selected': rating !== null && star <= rating }">
            <input v-model="rating" type="radio" :name="`${dialogId}-rating`" :value="star" :aria-label="`${star} étoile${star > 1 ? 's' : ''}`" />
            <DesignIcon :name="rating !== null && star <= rating ? 'star-filled' : 'star'" />
          </label>
          <Button v-if="rating" variant="ghost" size="xs" aria-label="Retirer la note" @click="rating = null">Effacer</Button>
        </div>
      </fieldset>
      <Select v-model="subject" label="Objet" :options="[...feedbackSubjects]" :searchable="false" required :disabled="busy || !!submission" placeholder="Choisir un objet" />
      <Input v-model="message" label="Votre message" type="textarea" :placeholder="placeholder" required maxlength="5000" :disabled="busy || !!submission" />
      <FeedbackState v-if="error" kind="error" layout="inline" :message="error" />
      <Button type="submit" :disabled="busy || !subject || !message.trim()">{{ busy ? 'Envoi en cours…' : submission ? 'Réessayer l’envoi' : 'Envoyer mon retour' }}</Button>
    </form>
    <form v-else-if="step === 'email'" class="feedback-form__body" @submit.prevent="saveEmail">
      <FeedbackState kind="success" message="Merci ! Votre retour est enregistré."><template #icon><Icon icon="mdi:check-circle-outline" width="24" /></template></FeedbackState>
      <p>Souhaitez-vous être informé de sa prise en compte ?</p>
      <Input v-model="email" label="Votre adresse e-mail" type="email" autocomplete="email" placeholder="vous@exemple.fr" required maxlength="254" :disabled="busy" />
      <p class="feedback-form__hint">Votre adresse servira uniquement au suivi de ce retour.</p>
      <FeedbackState v-if="error" kind="error" layout="inline" :message="error" />
      <Button type="submit" :disabled="busy || !email.trim()">{{ busy ? 'Enregistrement…' : 'Me tenir informé' }}</Button>
      <Button variant="ghost" :disabled="busy" @click="emit('close')">Non merci</Button>
    </form>
    <div v-else class="feedback-form__body">
      <FeedbackState kind="success" message="Votre adresse a bien été ajoutée."><template #icon><Icon icon="mdi:check-circle-outline" width="24" /></template></FeedbackState>
      <p>Nous pourrons vous informer de la prise en compte de votre retour.</p>
      <Button @click="emit('close')">Fermer</Button>
    </div>
    <footer class="feedback-form__privacy"><RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }" @click="emit('close')">Confidentialité de vos données</RouterLink></footer>
  </PopoverSurface>
</template>

<style scoped>
.feedback-form { width: min(380px, calc(100vw - 2 * var(--spacing-lg))); max-height: calc(100dvh - 2 * var(--spacing-lg)); overflow-y: auto; font: var(--type-body); }
.feedback-form__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-sm); padding: var(--spacing-lg); border-bottom: 1px solid var(--color-border-light); }
.feedback-form h2 { margin: 0; font: var(--type-panel-title); }
.feedback-form__header p { margin: var(--spacing-xs) 0 0; color: var(--color-text-secondary); font: var(--type-meta); }
.feedback-form__body { display: flex; flex-direction: column; gap: var(--spacing-md); padding: var(--spacing-lg); }
.feedback-form__body p { margin: 0; }
.feedback-form__rating { border: 0; padding: 0; margin: 0; min-width: 0; }
.feedback-form__rating legend { margin-bottom: var(--spacing-xs); font: var(--type-label); }
.feedback-form__stars { display: flex; align-items: center; gap: var(--spacing-xs); margin-top: var(--spacing-xs); }
.feedback-form__stars label { position: relative; display: flex; align-items: center; justify-content: center; width: var(--field-height-lg); height: var(--field-height-lg); cursor: pointer; color: var(--color-text-secondary); border-radius: var(--radius-sm); }
.feedback-form__stars input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.feedback-form__stars label:focus-within { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.feedback-form__stars .feedback-form__star--selected { color: var(--color-status-warning-foreground); }
.feedback-form__hint, .feedback-form__privacy { color: var(--color-text-secondary); font: var(--type-meta); }
.feedback-form__privacy { padding: 0 var(--spacing-lg) var(--spacing-lg); }
</style>
