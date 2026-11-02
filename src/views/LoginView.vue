<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { CURRENT_TERMS_VERSION, USERNAME_MAX, usernameError } from '@account-rules';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import { authService } from '@/services/AuthService';
import { useAuthStore } from '@/stores/useAuthStore';
import { canUseWorkspace, safeReturnPath } from '@/router/access';
import { useUsernameAvailability } from '@/composables/useUsernameAvailability';
import { rateLimitError, weakPasswordError } from '@/lib/authErrors';

const auth = useAuthStore(); const route = useRoute(); const router = useRouter();
const email = ref(''); const password = ref(''); const creating = ref(route.query.mode === 'signup');
const busy = ref(false); const error = ref(''); const message = ref(''); let alive = true;
// Sign-up only: the username is unique (checked live, enforced by the database) and the terms must be accepted.
const username = ref(''); const termsAccepted = ref(false);
const availability = useUsernameAvailability(username);
const signupBlocked = computed(() => creating.value && (!!usernameError(username.value) || availability.blocking.value || !termsAccepted.value));
onBeforeUnmount(() => { alive = false; password.value = ''; });
watch(() => canUseWorkspace(auth), verified => { if (verified) void router.replace(safeReturnPath(route.query.redirect)); }, { immediate: true });
watch(() => route.query.mode, mode => {
  creating.value = mode === 'signup'; password.value = ''; error.value = ''; message.value = ''; termsAccepted.value = false;
});

function signupError(providerError: { code?: string; name?: string }): string {
  const known = weakPasswordError(providerError) ?? rateLimitError(providerError);
  if (known) return known;
  switch (providerError.code) {
    case 'email_address_not_authorized':
      return 'Le service d’e-mail du projet n’autorise pas encore les inscriptions avec cette adresse. Sa configuration doit être complétée.';
    case 'email_address_invalid':
      return 'Cette adresse e-mail n’est pas acceptée par le service d’inscription. Vérifiez-la ou utilisez une autre adresse.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'Les inscriptions par e-mail sont actuellement désactivées.';
    case 'unexpected_failure':
      // The database refused the profile created with the account: the username was taken meanwhile.
      return 'Ce nom d’utilisateur vient d’être pris ou n’est pas accepté. Choisissez-en un autre.';
    default:
      return 'Création du compte impossible. Vérifiez les champs ou réessayez plus tard.';
  }
}

async function submit() {
  if (busy.value || signupBlocked.value) return;
  busy.value = true; error.value = ''; message.value = '';
  try {
    await auth.initialize();
    const client = authService.getClient();
    if (!auth.enabled || !client) throw new Error('La connexion utilisateur n’est pas encore activée.');
    const credentials = { email: email.value.trim(), password: password.value };
    const result = creating.value
      ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/login`,
          data: { username: username.value.trim(), terms_version: CURRENT_TERMS_VERSION } } })
      : await client.auth.signInWithPassword(credentials);
    if (!alive) return;
    if (result.error) {
      error.value = creating.value ? signupError(result.error) : 'Connexion impossible. Vérifiez vos identifiants et la confirmation de votre adresse.';
      return;
    }
    password.value = '';
    if (creating.value && !result.data.session) {
      message.value = 'Vérifiez votre boîte mail pour confirmer votre compte, puis connectez-vous.';
    } else {
      await auth.refreshAccount();
      if (alive && auth.signedIn) await router.replace(safeReturnPath(route.query.redirect));
      else if (alive) error.value = auth.error ?? 'La session n’a pas pu être vérifiée. Réessayez.';
    }
  } catch {
    if (alive) error.value = 'La connexion est indisponible. Réessayez dans un instant.';
  } finally { if (alive) busy.value = false; }
}
function switchMode() {
  const { mode: _mode, ...query } = route.query;
  void router.replace({ name: 'login', query: { ...query, ...(creating.value ? {} : { mode: 'signup' }) } });
}
</script>

<template>
  <section class="account-page">
    <div class="account-panel">
      <h2>{{ creating ? 'Créer un compte' : 'Se connecter' }}</h2>
      <p>La timeline et la recherche sont accessibles à tous. Connectez-vous pour gérer vos frises.</p>
      <p v-if="auth.error" role="alert">{{ auth.error }} <Button size="sm" @click="auth.initialize">Réessayer</Button></p>
      <p v-if="auth.enabled === false" role="status">La connexion utilisateur sera disponible après la mise en place des accès.</p>
      <form v-else @submit.prevent="submit" :aria-busy="busy">
        <Input v-if="creating" id="account-username" v-model="username" label="Nom d’utilisateur" name="username" autocomplete="username" required
          :maxlength="USERNAME_MAX" :disabled="busy" :error="availability.message.value"
          :hint="availability.hint.value || 'Unique, il signe vos frises. Lettres sans accent, chiffres, « _ », « . » ou « - ».'" />
        <Input id="account-email" v-model="email" label="Adresse e-mail" type="email" name="email" autocomplete="email" required :disabled="busy" />
        <Input label="Mot de passe" id="account-password" v-model="password" type="password" name="password" :autocomplete="creating ? 'new-password' : 'current-password'" :minlength="creating ? 8 : undefined" :aria-describedby="creating ? 'account-password-hint' : undefined" required :disabled="busy" />
        <p v-if="creating" id="account-password-hint">Au moins 8 caractères. Utilisez un mot de passe unique ; les mots de passe trop faibles ou compromis sont refusés.</p>
        <label v-if="creating" class="account-terms">
          <input v-model="termsAccepted" type="checkbox" required :disabled="busy" />
          <span>J’accepte les <RouterLink :to="{ name: 'legal', params: { page: 'conditions' } }" target="_blank">conditions d’utilisation</RouterLink>
            et j’ai lu la <RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }" target="_blank">politique de confidentialité</RouterLink>.</span>
        </label>
        <p v-if="error" role="alert">{{ error }}</p>
        <p v-if="message" role="status">{{ message }}</p>
        <Button type="submit" :disabled="busy || !auth.ready || signupBlocked">{{ busy ? 'Veuillez patienter…' : creating ? 'Créer mon compte' : 'Se connecter' }}</Button>
        <Button variant="ghost" :disabled="busy" @click="switchMode">{{ creating ? 'J’ai déjà un compte' : 'Créer un compte' }}</Button>
        <RouterLink v-if="!creating" class="account-forgot" :to="{ name: 'password-reset', query: email.trim() ? { email: email.trim() } : {} }">Mot de passe oublié ?</RouterLink>
      </form>
      <RouterLink to="/timeline">Revenir à la timeline</RouterLink>
      <nav class="account-legal" aria-label="Informations légales">
        <RouterLink :to="{ name: 'legal', params: { page: 'mentions-legales' } }">Mentions légales</RouterLink>
        <RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }">Confidentialité</RouterLink>
        <RouterLink :to="{ name: 'legal', params: { page: 'cookies' } }">Cookies</RouterLink>
      </nav>
    </div>
  </section>
</template>

<style scoped>
.account-page { overflow: auto; padding: var(--spacing-lg); box-sizing: border-box; }
.account-panel { max-width: 28rem; margin: 2rem auto; padding: var(--spacing-lg); background: var(--color-surface-default); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); }
h2 { margin-top: 0; }
form { display: flex; flex-direction: column; gap: var(--spacing-sm); margin: var(--spacing-lg) 0; }
.account-terms { display: flex; align-items: flex-start; gap: var(--spacing-sm); font-size: var(--font-size-sm); }
.account-terms input { margin-top: 3px; }
.account-forgot { align-self: center; font-size: var(--font-size-sm); }
.account-legal { display: flex; flex-wrap: wrap; gap: var(--spacing-md); margin-top: var(--spacing-lg); font-size: var(--font-size-xs); }
</style>
