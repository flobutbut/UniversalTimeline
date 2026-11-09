<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import Select from '@/components/base/Select.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import Tag from '@/components/base/Tag.vue';
import Switch from '@/components/base/Switch.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useFeedbackStore } from '@/stores/useFeedbackStore';
import { feedbackApi } from '@/services/FeedbackApiService';
import { feedbackReply, feedbackMailto } from '@/lib/feedbackReply';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { feedbackSubjects, feedbackStatuses, type UserFeedback, type FeedbackStatus, type FeedbackSubject, type FeedbackFilters } from '../../../server/src/shared/feedback';
import { formatAdminDate } from './adminFormat';
import type { FeedbackNotificationSettings } from '../../../server/src/shared/feedback';

const items = ref<UserFeedback[]>([]), total = ref(0), offset = ref(0), loading = ref(false), error = ref('');
const saving = ref<string | null>(null), filter = ref<string | null>('all');
const subjectFilter = ref<string | null>('all');
const reply = ref<UserFeedback | null>(null), replySubject = ref(''), replyBody = ref('');
const notifications = ref<FeedbackNotificationSettings | null>(null), notificationBusy = ref(false), notificationError = ref('');
const confirm = useConfirm();
const feature = useFeedbackStore();
let request = 0;
onBeforeUnmount(() => { request++; });
const filters = computed<FeedbackFilters>(() => ({
  status: filter.value && filter.value !== 'all' ? filter.value as FeedbackStatus : undefined,
  subject: subjectFilter.value && subjectFilter.value !== 'all' ? subjectFilter.value as FeedbackSubject : undefined,
}));
const mailto = computed(() => reply.value?.email ? feedbackMailto(reply.value.email, replySubject.value, replyBody.value) : '');
const subjectLabel = (value: string) => feedbackSubjects.find(item => item.value === value)?.label ?? value;
const statusLabel = (value: string) => feedbackStatuses.find(item => item.value === value)?.label ?? value;
async function load() {
  const current = ++request; loading.value = true; error.value = '';
  try {
    const result = await feedbackApi.list(offset.value, filters.value);
    if (current === request) {
      items.value = result.items; total.value = result.total;
      if (offset.value > 0 && offset.value >= result.total) {
        offset.value = Math.max(0, Math.floor((result.total - 1) / 50) * 50);
        await load();
      }
    }
  } catch (cause) { if (current === request) error.value = mutationErrorMessage(cause, 'Lecture des retours impossible.'); }
  finally { if (current === request) loading.value = false; }
}
async function changeStatus(item: UserFeedback, status: FeedbackStatus) {
  if (saving.value) return;
  saving.value = item.id; error.value = '';
  try { await feedbackApi.setStatus(item.id, status); item.status = status; await load(); }
  catch (cause) { error.value = mutationErrorMessage(cause, 'Changement de statut impossible.'); }
  finally { saving.value = null; }
}
function compose(item: UserFeedback) {
  const template = feedbackReply(item);
  replySubject.value = template.subject; replyBody.value = template.body; reply.value = item;
}
async function remove(item: UserFeedback) {
  if (saving.value) return;
  saving.value = item.id; error.value = '';
  try {
    if (!await confirm('Supprimer ce retour ?', 'Cette suppression est définitive.')) return;
    await feedbackApi.remove(item.id);
    await load();
  } catch (cause) { error.value = mutationErrorMessage(cause, 'Suppression impossible.'); }
  finally { saving.value = null; }
}
function page(delta: number) { offset.value += delta; void load(); }
async function loadNotifications() {
  notificationError.value = ''; notificationBusy.value = true;
  try { notifications.value = await feedbackApi.notifications(); }
  catch (cause) { notificationError.value = mutationErrorMessage(cause, 'Lecture des préférences de notification impossible.'); }
  finally { notificationBusy.value = false; }
}
async function setNotifications(enabled: boolean) {
  if (notificationBusy.value) return;
  notificationBusy.value = true; notificationError.value = '';
  try { notifications.value = await feedbackApi.setNotifications(enabled); }
  catch (cause) { notificationError.value = mutationErrorMessage(cause, 'Enregistrement des notifications impossible.'); }
  finally { notificationBusy.value = false; }
}
onMounted(load);
onMounted(loadNotifications);
onMounted(feature.refresh);
watch([filter, subjectFilter], () => { offset.value = 0; void load(); });
</script>

<template>
  <section class="admin-feedback" aria-labelledby="admin-feedback-title">
    <header class="admin-feedback__header">
      <div><h2 id="admin-feedback-title">Retours utilisateurs</h2><p>{{ total }} retour(s) {{ filters.subject || filters.status ? 'correspondant(s)' : 'reçu(s)' }}</p></div>
      <div class="admin-feedback__actions admin-feedback__header-actions">
        <Switch variant="sm" label-first :model-value="feature.enabled" label="Activer les avis" :disabled="!feature.loaded || feature.saving" @update:model-value="feature.setEnabled" />
        <Button variant="secondary" size="sm" :disabled="loading || !!saving" @click="load(); feature.refresh()">Actualiser</Button>
      </div>
    </header>
    <FeedbackState v-if="feature.error" kind="error" layout="inline" :message="feature.error" retryable @retry="feature.refresh" />
    <div class="admin-feedback__filters">
      <Select v-model="filter" label="Statut" :searchable="false" :disabled="!!saving" :options="[{ value: 'all', label: 'Tous les statuts' }, ...feedbackStatuses]" />
      <Select v-model="subjectFilter" label="Objet" :searchable="false" :disabled="!!saving" :options="[{ value: 'all', label: 'Tous les objets' }, ...feedbackSubjects]" />
      <div class="admin-feedback__notifications" :aria-busy="notificationBusy" :title="notifications && !notifications.available ? 'Envoi des e-mails à configurer' : undefined">
        <Switch variant="sm" :model-value="notifications?.enabled ?? false" :label="`Envoyer sur ${notifications?.email ?? '…'}`" :disabled="notificationBusy || !notifications || (!notifications.available && !notifications.enabled) || !notifications.email" @update:model-value="setNotifications" />
      </div>
    </div>
    <FeedbackState v-if="notificationError" kind="error" layout="inline" :message="notificationError"><template #actions><Button variant="ghost" size="xs" :disabled="notificationBusy" @click="loadNotifications">Réessayer</Button></template></FeedbackState>
    <FeedbackState v-if="loading" kind="loading" layout="inline" />
    <FeedbackState v-if="error" kind="error" layout="inline" :message="error" retryable @retry="load" />
    <FeedbackState v-if="!loading && !error && !items.length" kind="empty" layout="inline" message="Aucun retour ne correspond aux filtres." />
    <article v-for="item in items" v-show="!loading" :key="item.id" class="admin-feedback__card">
      <header class="admin-feedback__card-header"><h3>{{ subjectLabel(item.subject) }}</h3><Tag :label="statusLabel(item.status)" :variant="item.status === 'new' ? 'accent' : 'neutral'" /></header>
      <p class="admin-feedback__muted">{{ formatAdminDate(item.createdAt) }} · {{ item.rating === null ? 'Sans note' : `${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)} (${item.rating}/5)` }}</p>
      <p class="admin-feedback__message">{{ item.message }}</p>
      <a class="admin-feedback__page" :href="item.pageUrl" target="_blank" rel="noopener noreferrer">{{ item.pageUrl }}</a>
      <p class="admin-feedback__muted">{{ item.email || 'Aucun e-mail de suivi renseigné' }}</p>
      <div class="admin-feedback__actions">
        <Button v-for="status in feedbackStatuses.filter(status => status.value !== item.status)" :key="status.value" variant="tertiary" size="sm" :disabled="!!saving || loading" @click="changeStatus(item, status.value)">Marquer « {{ status.label }} »</Button>
        <Button v-if="item.email" size="sm" @click="compose(item)">Répondre</Button>
        <Button variant="danger" size="sm" :disabled="!!saving || loading" @click="remove(item)">Supprimer</Button>
      </div>
    </article>
    <nav v-if="total > 50" class="admin-feedback__actions" aria-label="Pages des retours">
      <Button variant="secondary" size="sm" :disabled="loading || !!saving || offset === 0" @click="page(-50)">Précédent</Button>
      <span>{{ offset + 1 }}–{{ Math.min(offset + 50, total) }} sur {{ total }}</span>
      <Button variant="secondary" size="sm" :disabled="loading || !!saving || offset + 50 >= total" @click="page(50)">Suivant</Button>
    </nav>
    <Teleport to="body">
      <ModalShell v-if="reply" title="Répondre au retour" height="auto" @close="reply = null">
        <div class="admin-feedback__reply">
          <p>À : {{ reply.email }}</p>
          <Input v-model="replySubject" label="Objet" />
          <Input v-model="replyBody" label="Réponse" type="textarea" textarea-size="lg" />
          <p class="admin-feedback__muted">Relisez et complétez le modèle. Le bouton ouvre votre messagerie ; vous y confirmez l’envoi.</p>
        </div>
        <template #footer-right><Button :to="mailto" :disabled="!replySubject.trim() || !replyBody.trim()">Ouvrir dans ma messagerie</Button></template>
      </ModalShell>
    </Teleport>
  </section>
</template>

<style scoped>
.admin-feedback { display: flex; flex-direction: column; gap: var(--spacing-lg); min-width: 0; }
.admin-feedback__header, .admin-feedback__card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-md); }
.admin-feedback h2 { margin: 0; font-size: var(--font-size-2xl); }
.admin-feedback h3 { margin: 0; font-size: var(--font-size-lg); }
.admin-feedback p { margin: 0; }
.admin-feedback__header p, .admin-feedback__muted { color: var(--color-text-secondary); font: var(--type-meta); }
.admin-feedback__filters { display: flex; align-items: flex-end; flex-wrap: wrap; gap: var(--spacing-md); }
.admin-feedback__filters > :deep(.base-select) { flex: 1 1 180px; min-width: 0; }
.admin-feedback__card { display: flex; flex-direction: column; gap: var(--spacing-md); padding: var(--spacing-lg); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--color-surface-default); }
.admin-feedback__message { white-space: pre-wrap; overflow-wrap: anywhere; }
.admin-feedback__page { overflow-wrap: anywhere; font: var(--type-meta); }
.admin-feedback__actions { display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing-sm); }
.admin-feedback__header-actions { gap: var(--spacing-xl); }
.admin-feedback__reply { display: flex; flex-direction: column; gap: var(--spacing-lg); padding-top: var(--spacing-lg); }
.admin-feedback__notifications { display: flex; align-items: center; min-height: var(--field-height-lg); margin-left: auto; }
.admin-feedback__notifications :deep(.switch__label) { white-space: normal; }
</style>
