<template>
  <section class="admin-user" aria-labelledby="admin-user-title">
    <RouterLink class="admin-user__back" :to="{ name: 'admin', query: { section: 'users' } }">← Tous les utilisateurs</RouterLink>
    <FeedbackState v-if="loading && !user" kind="loading" layout="inline" />
    <FeedbackState v-else-if="error && !user" kind="error" layout="inline" :message="error" retryable @retry="load" />
    <template v-else-if="user">
      <header class="admin-user__header">
        <UserAvatar :username="user.username" :color="user.avatarColor ?? undefined" :icon="user.avatarIcon ?? undefined" size="lg" />
        <div>
          <h2 id="admin-user-title" ref="titleRef" tabindex="-1">{{ user.username ?? 'Sans nom d’utilisateur' }}</h2>
          <p class="admin-user__muted">{{ user.email ?? '—' }}</p>
          <span class="admin-user__tags"><Tag v-for="status in statuses" :key="status" :label="status" :variant="status === 'Admin' ? 'accent' : 'neutral'" /></span>
        </div>
      </header>

      <dl class="admin-user__card admin-user__facts">
        <dt>Inscription</dt><dd>{{ formatAdminDate(user.createdAt, true) }}</dd>
        <dt>Dernière connexion</dt><dd>{{ formatAdminDate(user.lastSignInAt, true) }}</dd>
        <dt>Adresse e-mail</dt><dd>{{ user.confirmed ? 'Confirmée' : 'Non confirmée' }}</dd>
        <dt>Conditions</dt><dd>{{ user.termsVersion ? `Version du ${user.termsVersion}, acceptée le ${formatAdminDate(user.termsAcceptedAt)}` : 'Non acceptées' }}</dd>
        <dt>Rôle</dt><dd>{{ user.isAdmin ? 'Administrateur' : user.isEditor ? 'Éditeur' : 'Compte personnel' }}</dd>
        <dt>Identifiant</dt><dd class="admin-user__id">{{ user.id }}</dd>
      </dl>

      <section class="admin-user__card" aria-labelledby="admin-user-actions">
        <h3 id="admin-user-actions">Actions</h3>
        <p v-if="isSelf" class="admin-user__muted">C’est votre compte : modifiez-le depuis votre profil. Les actions d’administration ne s’appliquent pas à soi-même.</p>
        <p v-else-if="user.isAdmin" class="admin-user__muted">Retirez le rôle administrateur avant de suspendre ou de supprimer ce compte.</p>
        <p v-if="actionError" class="admin-user__error" role="alert">{{ actionError }}</p>
        <div class="admin-user__actions">
          <Button variant="secondary" size="sm" :disabled="busy || !user.email || !user.confirmed" @click="sendReset">Envoyer un lien de réinitialisation du mot de passe</Button>
          <Button variant="secondary" size="sm" :disabled="busy || isSelf || (!user.isAdmin && (!user.confirmed || user.suspended))" @click="toggleAdmin">
            {{ user.isAdmin ? 'Retirer le rôle administrateur' : 'Nommer administrateur' }}</Button>
          <Button v-if="!user.isAdmin" variant="secondary" size="sm" :disabled="busy || isSelf || (!user.isEditor && (!user.confirmed || user.suspended))" @click="toggleEditor">
            {{ user.isEditor ? 'Retirer le rôle éditeur' : 'Nommer éditeur' }}</Button>
          <Button variant="secondary" size="sm" :disabled="busy || isSelf || user.isAdmin" @click="toggleSuspension">{{ user.suspended ? 'Réactiver le compte' : 'Suspendre le compte' }}</Button>
          <Button variant="danger" size="sm" :disabled="busy || isSelf || user.isAdmin" @click="remove">Supprimer le compte et ses frises</Button>
        </div>
      </section>

      <section class="admin-user__card" aria-labelledby="admin-user-stories">
        <h3 id="admin-user-stories">Frises ({{ user.storyList.length }})</h3>
        <ul v-if="user.storyList.length" class="admin-user__list">
          <li v-for="story in user.storyList" :key="story.id">
            <span class="admin-user__story-title">
              <RouterLink v-if="story.isPublic" :to="storyTimelineLocation(String(story.id))">{{ story.title }}</RouterLink>
              <span v-else>{{ story.title }}</span>
              <Tag :label="story.isPublic ? 'Publique' : 'Privée'" />
            </span>
            <span class="admin-user__muted">{{ story.periods }} périodes · {{ story.events }} événements · modifiée le {{ formatAdminDate(story.updatedAt) }}</span>
          </li>
        </ul>
        <p v-else class="admin-user__muted">Aucune frise.</p>
      </section>

      <section class="admin-user__card" aria-labelledby="admin-user-history">
        <h3 id="admin-user-history">Historique d’administration</h3>
        <ul v-if="user.history.length" class="admin-user__list">
          <li v-for="entry in user.history" :key="`${entry.createdAt}-${entry.action}`">
            <span>{{ adminActionLabels[entry.action] }}</span>
            <span class="admin-user__muted">{{ formatAdminDate(entry.createdAt, true) }}{{ entry.actorUsername ? ` · par ${entry.actorUsername}` : '' }}</span>
          </li>
        </ul>
        <p v-else class="admin-user__muted">Aucune action d’administration sur ce compte.</p>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import Button from '@/components/base/Button.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import Tag from '@/components/base/Tag.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { adminActionLabels, adminApi, type AdminUserDetail } from '@/services/AdminApiService';
import { authService } from '@/services/AuthService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { rateLimitError } from '@/lib/authErrors';
import { storyTimelineLocation } from '@/router/storyTarget';
import { formatAdminDate } from './adminFormat';

const props = defineProps<{ userId: string }>();
const auth = useAuthStore(); const router = useRouter(); const confirm = useConfirm(); const toast = useToast();
const user = ref<AdminUserDetail | null>(null); const loading = ref(false); const error = ref('');
const busy = ref(false); const actionError = ref(''); const titleRef = ref<HTMLElement | null>(null);
let request = 0;
onBeforeUnmount(() => { request++; });

const isSelf = computed(() => user.value?.id === auth.account?.id);
const statuses = computed(() => {
  const u = user.value; if (!u) return [];
  return [u.isAdmin && 'Admin', u.isEditor && 'Éditeur', u.suspended && 'Suspendu', !u.confirmed && 'Non confirmé', !u.username && 'Sans profil'].filter((value): value is string => !!value);
});

async function load(focus = false) {
  const current = ++request; loading.value = true; error.value = '';
  try {
    const next = await adminApi.user(props.userId);
    if (current !== request) return;
    user.value = next;
    if (focus) void nextTick(() => titleRef.value?.focus());
  } catch (cause) { if (current === request) error.value = mutationErrorMessage(cause, 'Lecture du compte impossible.'); }
  finally { if (current === request) loading.value = false; }
}
onMounted(() => load(true));

/** Runs a confirmed admin action, then reloads the fiche (the database is the reference). */
async function act(title: string, message: string, operation: () => Promise<void>, done: string) {
  if (busy.value || !await confirm(title, message)) return;
  busy.value = true; actionError.value = '';
  try { await operation(); toast.show(done, 'success'); await load(); }
  catch (cause) { actionError.value = mutationErrorMessage(cause, 'Action impossible. Rechargez la fiche avant de réessayer.'); }
  finally { busy.value = false; }
}
const label = () => user.value?.username ?? user.value?.email ?? 'ce compte';

const toggleAdmin = () => {
  const granting = !user.value!.isAdmin;
  return act(granting ? 'Nommer administrateur ?' : 'Retirer le rôle administrateur ?',
    granting ? `${label()} aura accès à cet espace, au catalogue et aux actions sur tous les comptes.` : `${label()} redeviendra un compte personnel.`,
    () => adminApi.setAdmin(props.userId, granting), granting ? 'Rôle administrateur accordé.' : 'Rôle administrateur retiré.');
};
const toggleSuspension = () => {
  const suspending = !user.value!.suspended;
  return act(suspending ? 'Suspendre ce compte ?' : 'Réactiver ce compte ?',
    suspending ? `${label()} sera déconnecté et ne pourra plus se connecter. Ses frises restent en place et visibles selon leur réglage.` : `${label()} pourra de nouveau se connecter.`,
    () => adminApi.setSuspended(props.userId, suspending), suspending ? 'Compte suspendu.' : 'Compte réactivé.');
};
const toggleEditor = () => {
  const granting = !user.value!.isEditor;
  return act(granting ? 'Nommer éditeur ?' : 'Retirer le rôle éditeur ?',
    granting ? `${label()} pourra modifier le contenu et l’organisation de toutes les frises publiques. Leur suppression et leur visibilité restent réservées à leur propriétaire.` : `${label()} pourra seulement modifier ses propres frises.`,
    () => adminApi.setEditor(props.userId, granting), granting ? 'Rôle éditeur accordé.' : 'Rôle éditeur retiré.');
};
async function remove() {
  if (busy.value || !await confirm('Supprimer définitivement ce compte ?',
    `Le compte ${label()} et ses ${user.value!.stories} frise(s) seront supprimés. Les périodes et événements du catalogue partagé sont conservés. Cette action est irréversible.`)) return;
  busy.value = true; actionError.value = '';
  try {
    await adminApi.deleteUser(props.userId);
    toast.show('Compte supprimé.', 'success');
    await router.replace({ name: 'admin', query: { section: 'users' } });
  } catch (cause) { actionError.value = mutationErrorMessage(cause, 'Suppression impossible. Rechargez la fiche avant de réessayer.'); }
  finally { busy.value = false; }
}
/** Same e-mail as « Mot de passe oublié » : the link opens /reset-password in any browser. */
function sendReset() {
  const email = user.value!.email!;
  return act('Envoyer un lien de réinitialisation ?', `Un e-mail sera envoyé à ${email} pour choisir un nouveau mot de passe. Le mot de passe actuel reste valable tant qu’il n’est pas changé.`,
    async () => {
      const result = await authService.getClient()!.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (result.error) throw new Error(rateLimitError(result.error) ?? 'Envoi impossible. Réessayez plus tard.');
    }, `Lien envoyé à ${email}.`);
}
</script>

<style scoped>
.admin-user { display: flex; flex-direction: column; gap: var(--spacing-lg); min-width: 0; }
.admin-user h2 { margin: 0; font-size: var(--font-size-2xl); }
.admin-user h2:focus { outline: none; }
.admin-user h3 { margin: 0; font-size: var(--font-size-base); }
.admin-user__back { align-self: flex-start; font-size: var(--font-size-sm); }
.admin-user__header { display: flex; align-items: center; gap: var(--spacing-lg); }
.admin-user__header > div { display: flex; flex-direction: column; gap: var(--spacing-xs); min-width: 0; overflow-wrap: anywhere; }
.admin-user__header p { margin: 0; }
.admin-user__muted { color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; }
.admin-user__error { margin: 0; color: var(--color-status-error-foreground); }
.admin-user__tags, .admin-user__story-title { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-xs); }
.admin-user__card {
  display: flex; flex-direction: column; gap: var(--spacing-md); margin: 0; padding: var(--spacing-lg);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default);
}
.admin-user__facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: var(--spacing-sm) var(--spacing-lg); }
.admin-user__facts dt { color: var(--color-text-secondary); }
.admin-user__facts dd { margin: 0; overflow-wrap: anywhere; }
.admin-user__id { font-family: var(--font-family-mono); font-size: var(--font-size-sm); }
.admin-user__actions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.admin-user__list { display: flex; flex-direction: column; gap: var(--spacing-sm); margin: 0; padding: 0; list-style: none; }
.admin-user__list li { display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; }
@media (max-width: 560px) { .admin-user__facts { grid-template-columns: minmax(0, 1fr); } .admin-user__facts dd { margin-bottom: var(--spacing-xs); } }
</style>
