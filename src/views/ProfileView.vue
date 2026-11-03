<template>
  <SidebarLayout menu-label="Sections du profil" :items="menu" :active="section">
    <FeedbackState v-if="auth.profile === undefined && !auth.profileError" kind="loading" layout="inline" />
    <FeedbackState v-else-if="auth.profileError" kind="error" layout="inline" :message="auth.profileError" retryable @retry="auth.ensureProfile(true)" />

    <section v-else-if="section === 'profile'" class="profile-view" aria-labelledby="profile-title">
      <h2 id="profile-title">Profil</h2>
      <p v-if="!auth.profile" class="profile-view__notice" role="status">
        Choisissez un nom d’utilisateur : il est obligatoire pour créer des frises, qu’il signe automatiquement.
      </p>
      <form class="profile-view__card" aria-label="Nom d’utilisateur et avatar" @submit.prevent="saveProfile">
        <div class="profile-view__identity">
          <UserAvatar :username="draft.username" :color="draft.avatarColor" :icon="draft.avatarIcon" size="lg" />
          <Input v-model="draft.username" class="profile-view__username" label="Nom d’utilisateur" required autocomplete="username"
            :maxlength="USERNAME_MAX" :error="usernameFieldError" :hint="availability.hint.value || 'Unique, visible sur vos frises publiques.'" />
        </div>
        <fieldset class="profile-view__choices">
          <legend>Couleur de l’avatar</legend>
          <label v-for="color in AVATAR_COLORS" :key="color" class="profile-view__swatch" :title="colorLabels[color]">
            <input v-model="draft.avatarColor" type="radio" name="avatar-color" :value="color" class="sr-only" />
            <span class="profile-view__swatch-dot" :style="{ background: `var(--color-avatar-${color})` }" aria-hidden="true" />
            <span class="sr-only">{{ colorLabels[color] }}</span>
          </label>
        </fieldset>
        <fieldset class="profile-view__choices">
          <legend>Motif de l’avatar</legend>
          <label v-for="icon in AVATAR_ICONS" :key="icon" class="profile-view__icon-choice" :title="iconLabels[icon]">
            <input v-model="draft.avatarIcon" type="radio" name="avatar-icon" :value="icon" class="sr-only" />
            <UserAvatar :username="draft.username" :color="draft.avatarColor" :icon="icon" size="md" />
            <span class="sr-only">{{ iconLabels[icon] }}</span>
          </label>
        </fieldset>
        <p v-if="saveError" class="profile-view__error" role="alert">{{ saveError }}</p>
        <div class="profile-view__actions">
          <Button v-if="changed && auth.profile" type="button" variant="secondary" size="sm" :disabled="saving" @click="resetDraft">Annuler</Button>
          <Button type="submit" size="sm" :disabled="!changed || saving || availability.blocking.value">{{ auth.profile ? 'Enregistrer' : 'Créer mon profil' }}</Button>
        </div>
      </form>
      <EmailChangeCard :email="identity.email" :pending-email="identity.newEmail" @requested="loadIdentity" />
      <dl class="profile-view__card profile-view__facts">
        <dt>Membre depuis</dt><dd>{{ identity.createdAt ? formatRecordDate(identity.createdAt) : '—' }}</dd>
        <dt>Rôle</dt><dd>{{ auth.roleLabel }}</dd>
      </dl>
    </section>

    <section v-else-if="section === 'privacy'" class="profile-view" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Données et confidentialité</h2>
      <div class="profile-view__card">
        <h3>Conditions d’utilisation</h3>
        <p v-if="termsAccepted">Vous avez accepté la version du {{ auth.profile?.termsVersion }} le {{ formatRecordDate(new Date(auth.profile!.termsAcceptedAt!)) }}.</p>
        <template v-else>
          <p>{{ auth.profile?.termsVersion ? 'Les conditions ont été mises à jour.' : 'Vous n’avez pas encore accepté les conditions en vigueur.' }}
            Lisez les <RouterLink :to="{ name: 'legal', params: { page: 'conditions' } }">conditions d’utilisation</RouterLink> et la
            <RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }">politique de confidentialité</RouterLink>.</p>
          <div class="profile-view__actions">
            <Button size="sm" :disabled="!auth.profile || accepting" @click="acceptTerms">J’accepte la version du {{ CURRENT_TERMS_VERSION }}</Button>
          </div>
        </template>
      </div>
      <div class="profile-view__card">
        <h3>Télécharger mes données</h3>
        <p>Un fichier JSON avec votre compte, votre profil et toutes vos frises (droit d’accès et de portabilité).</p>
        <p v-if="exportError" class="profile-view__error" role="alert">{{ exportError }}</p>
        <div class="profile-view__actions"><Button variant="secondary" size="sm" :disabled="exporting" @click="exportData">Télécharger (JSON)</Button></div>
      </div>
      <div class="profile-view__card">
        <h3>Cookies</h3>
        <p>{{ consent.trackingConfigured ? (consent.analyticsAllowed ? 'Mesure d’audience acceptée.' : 'Mesure d’audience refusée ou non choisie.') : 'Aucun cookie de mesure d’audience n’est utilisé pour le moment.' }}</p>
        <div class="profile-view__actions"><Button variant="secondary" size="sm" @click="consent.openPreferences">Gérer mes préférences</Button></div>
      </div>
      <nav class="profile-view__card" aria-label="Informations légales">
        <h3>Informations légales</h3>
        <ul class="profile-view__links">
          <li v-for="page in LEGAL_PAGES" :key="page"><RouterLink :to="{ name: 'legal', params: { page } }">{{ legalDocuments[page].title }}</RouterLink></li>
          <li><RouterLink :to="{ name: 'contact' }">Contact</RouterLink></li>
        </ul>
      </nav>
      <div class="profile-view__card profile-view__danger">
        <h3>Supprimer mon compte</h3>
        <p>Votre compte, votre profil et <strong>toutes vos frises</strong> ({{ ownStoryCount }}) sont supprimés définitivement. Les périodes et événements du catalogue partagé sont conservés. Pensez à télécharger vos données avant.</p>
        <Input v-model="deleteConfirmation" :label="`Pour confirmer, saisissez « ${confirmationWord} »`" autocomplete="off" />
        <p v-if="deleteError" class="profile-view__error" role="alert">{{ deleteError }}</p>
        <div class="profile-view__actions">
          <Button variant="danger" size="sm" :disabled="deleteConfirmation.trim() !== confirmationWord || deleting" @click="deleteAccount">Supprimer définitivement</Button>
        </div>
      </div>
    </section>

    <section v-else class="profile-view" aria-labelledby="session-title">
      <h2 id="session-title">Session</h2>
      <div class="profile-view__card">
        <p>La déconnexion ferme la session de ce navigateur. Vos frises restent enregistrées.</p>
        <div class="profile-view__actions"><Button variant="secondary" size="sm" :disabled="signingOut" @click="signOut">Se déconnecter</Button></div>
      </div>
    </section>
  </SidebarLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { AVATAR_COLORS, AVATAR_ICONS, CURRENT_TERMS_VERSION, USERNAME_MAX, type AvatarColor, type AvatarIcon } from '@account-rules';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import SidebarLayout, { type SidebarItem } from '@/components/base/SidebarLayout.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import EmailChangeCard from '@/components/EmailChangeCard.vue';
import { authService } from '@/services/AuthService';
import { profileApi } from '@/services/ProfileApiService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useConsentStore } from '@/stores/useConsentStore';
import { useDataStore } from '@/stores/useDataStore';
import { useToast } from '@/composables/useToast';
import { useUsernameAvailability } from '@/composables/useUsernameAvailability';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { track } from '@/lib/analytics';
import { formatRecordDate } from '@/lib/storyListDates';
import { LEGAL_PAGES, legalDocuments } from '@/lib/legalDocuments';

type Section = 'profile' | 'privacy' | 'session';
const menu: SidebarItem[] = [
  { key: 'profile', label: 'Profil', icon: 'mdi:account-outline', to: { name: 'profile' } },
  { key: 'privacy', label: 'Données et confidentialité', icon: 'mdi:shield-lock-outline', to: { name: 'profile', query: { section: 'privacy' } } },
  { key: 'session', label: 'Session', icon: 'mdi:logout', to: { name: 'profile', query: { section: 'session' } } },
];
const colorLabels: Record<AvatarColor, string> = { blue: 'Bleu', green: 'Vert', amber: 'Ambre', red: 'Rouge', violet: 'Violet', pink: 'Rose', teal: 'Sarcelle', slate: 'Ardoise' };
const iconLabels: Record<AvatarIcon, string> = { initial: 'Initiale', telescope: 'Télescope', earth: 'Terre', temple: 'Colonne antique', dna: 'ADN', rocket: 'Fusée', book: 'Livre', compass: 'Boussole' };

const auth = useAuthStore(); const consent = useConsentStore(); const data = useDataStore();
const route = useRoute(); const router = useRouter(); const toast = useToast();
const section = computed<Section>(() => route.query.section === 'privacy' || route.query.section === 'session' ? route.query.section : 'profile');

const draft = reactive<{ username: string; avatarColor: AvatarColor; avatarIcon: AvatarIcon }>({ username: '', avatarColor: 'blue', avatarIcon: 'initial' });
function resetDraft() {
  Object.assign(draft, { username: auth.profile?.username ?? '', avatarColor: auth.profile?.avatarColor ?? 'blue', avatarIcon: auth.profile?.avatarIcon ?? 'initial' });
  saveError.value = '';
}
const saving = ref(false); const saveError = ref('');
const availability = useUsernameAvailability(computed(() => draft.username), () => auth.profile?.username ?? null);
const usernameFieldError = computed(() => availability.message.value);
const changed = computed(() => draft.username.trim() !== (auth.profile?.username ?? '')
  || draft.avatarColor !== (auth.profile?.avatarColor ?? 'blue') || draft.avatarIcon !== (auth.profile?.avatarIcon ?? 'initial'));
watch(() => auth.profile, () => { if (!saving.value) resetDraft(); }, { immediate: true });
async function saveProfile() {
  if (saving.value || availability.blocking.value || !draft.username.trim()) return;
  saving.value = true; saveError.value = '';
  const previous = auth.profile?.username ?? '';
  try {
    await auth.saveProfile({ username: draft.username.trim(), avatarColor: draft.avatarColor, avatarIcon: draft.avatarIcon });
    if (draft.username.trim() !== previous) track('username_set', { first_time: !previous });
    toast.show('Profil enregistré.', 'success');
  } catch (error) { saveError.value = mutationErrorMessage(error, 'Enregistrement du profil impossible. Réessayez.'); }
  finally { saving.value = false; }
}

const identity = ref<{ email: string | null; newEmail: string | null; createdAt: Date | null }>({ email: null, newEmail: null, createdAt: null });
async function loadIdentity() {
  try { identity.value = await authService.getIdentity(); } catch { /* adresse affichée « — » */ }
}
const termsAccepted = computed(() => !!auth.profile?.termsAcceptedAt && auth.profile.termsVersion === auth.profile.currentTermsVersion);
const accepting = ref(false);
async function acceptTerms() {
  accepting.value = true;
  try { await auth.acceptTerms(CURRENT_TERMS_VERSION); toast.show('Acceptation enregistrée.', 'success'); }
  catch (error) { toast.show(mutationErrorMessage(error, 'Enregistrement impossible. Réessayez.'), 'error'); }
  finally { accepting.value = false; }
}

const exporting = ref(false); const exportError = ref('');
async function exportData() {
  exporting.value = true; exportError.value = '';
  try {
    const content = { account: { email: identity.value.email, createdAt: identity.value.createdAt?.toISOString() ?? null }, ...await profileApi.exportData(),
      browserStorage: { consent: consent.choice } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `universal-timeline-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    link.click(); URL.revokeObjectURL(url);
  } catch { exportError.value = 'Export impossible. Réessayez.'; }
  finally { exporting.value = false; }
}

const ownStoryCount = computed(() => data.stories.filter(story => auth.ownsStory(story)).length);
const confirmationWord = computed(() => auth.profile?.username ?? 'SUPPRIMER');
const deleteConfirmation = ref(''); const deleting = ref(false); const deleteError = ref('');
async function deleteAccount() {
  if (deleteConfirmation.value.trim() !== confirmationWord.value || deleting.value) return;
  deleting.value = true; deleteError.value = '';
  try { await auth.deleteAccount(); toast.show('Votre compte et vos frises ont été supprimés.', 'success'); await router.replace('/timeline'); }
  catch (error) { deleteError.value = mutationErrorMessage(error, 'Suppression impossible. Réessayez.'); }
  finally { deleting.value = false; }
}

const signingOut = ref(false);
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try { await auth.signOut(); await router.replace('/timeline'); }
  catch { toast.show('Déconnexion impossible. Réessayez.', 'error'); }
  finally { signingOut.value = false; }
}

onMounted(async () => {
  void auth.ensureProfile(); void data.ensureStoriesLoaded().catch(() => undefined);
  // Return from an e-mail change link: the SDK has consumed the one-time code, which leaves the address bar.
  if (route.query.code !== undefined) {
    await authService.settleUrlSession();
    const { code: _code, ...query } = route.query; void router.replace({ query });
  }
  await loadIdentity();
});
</script>

<style scoped>
.profile-view { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.profile-view h2 { margin: 0; font-size: var(--font-size-xl); }
.profile-view h3 { margin: 0; font-size: var(--font-size-base); }
.profile-view__notice { margin: 0; padding: var(--spacing-md); border-radius: var(--radius-md); background: var(--color-status-warning-background); color: var(--color-text-primary); }
.profile-view__card {
  display: flex; flex-direction: column; gap: var(--spacing-md); margin: 0; padding: var(--spacing-lg);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default);
}
.profile-view__card p { margin: 0; max-width: 72ch; }
.profile-view__identity { display: flex; align-items: flex-start; gap: var(--spacing-lg); }
.profile-view__username { flex: 1; min-width: 0; }
.profile-view__choices { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin: 0; padding: 0; border: 0; }
.profile-view__choices legend { width: 100%; margin-bottom: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.profile-view__swatch, .profile-view__icon-choice { display: inline-flex; padding: 3px; border: 2px solid transparent; border-radius: 50%; cursor: pointer; }
.profile-view__swatch-dot { width: 26px; height: 26px; border-radius: 50%; }
.profile-view__swatch:has(input:checked), .profile-view__icon-choice:has(input:checked) { border-color: var(--color-text-link); }
.profile-view__swatch:has(input:focus-visible), .profile-view__icon-choice:has(input:focus-visible) { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.profile-view__actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: var(--spacing-sm); }
.profile-view__error { color: var(--color-status-error-foreground); }
.profile-view__facts { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: var(--spacing-sm) var(--spacing-lg); }
.profile-view__facts dt { color: var(--color-text-secondary); }
.profile-view__facts dd { margin: 0; overflow-wrap: anywhere; }
.profile-view__links { margin: 0; padding-left: var(--spacing-lg); }
.profile-view__danger { border-color: var(--color-status-error-foreground); }
.profile-view__danger h3 { color: var(--color-status-error-foreground); }
@media (max-width: 720px) {
  .profile-view__identity { flex-direction: column; }
  .profile-view__facts { grid-template-columns: minmax(0, 1fr); gap: var(--spacing-xs); }
  .profile-view__facts dd { margin-bottom: var(--spacing-sm); }
}
</style>
