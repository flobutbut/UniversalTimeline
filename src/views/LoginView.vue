<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { CURRENT_TERMS_VERSION, USERNAME_MAX, usernameError } from '@account-rules';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import { authService } from '@/services/AuthService';
import { useAuthStore } from '@/stores/useAuthStore';
import { canUseWorkspace, safeReturnPath } from '@/router/access';
import { useUsernameAvailability } from '@/composables/useUsernameAvailability';
import { rateLimitError, weakPasswordError } from '@/lib/authErrors';
import { track, type SignupBlock } from '@/lib/analytics';

const auth = useAuthStore(); const route = useRoute(); const router = useRouter();
const email = ref(''); const password = ref(''); const creating = ref(route.query.mode === 'signup');
const busy = ref(false); const error = ref(''); const message = ref(''); let alive = true;
/** Address the confirmation e-mail was sent to: the form gives way to the "check your inbox" step. */
const sentTo = ref('');
/** Sign-in refused because the address is not confirmed yet: offer to send the link again. */
const unconfirmed = ref(false);
const resending = ref(false); const resendMessage = ref(''); const resendError = ref('');
const heading = ref<HTMLElement | null>(null);
// The form disappears on success: move focus to the new step so it is announced and the page does not seem unchanged.
watch(sentTo, address => { if (address) void nextTick(() => heading.value?.focus()); });
const confirmRedirect = () => `${window.location.origin}/login?confirmed=1`;
// Return from the confirmation link: the address is confirmed server-side before the redirect.
if (route.query.confirmed === '1') message.value = 'Adresse e-mail confirmée. Connectez-vous pour accéder à votre espace.';
if (route.query.code !== undefined) void authService.settleUrlSession().finally(() => {
  if (!alive) return;
  const { code: _code, ...query } = route.query; void router.replace({ query });
});
// Sign-up only: the username is unique (checked live, enforced by the database) and the terms must be accepted.
const username = ref(''); const termsAccepted = ref(false);
const availability = useUsernameAvailability(username);
/** Client-side reason that keeps "Créer mon compte" disabled, if any. */
const signupBlock = computed<SignupBlock | null>(() => {
  if (!username.value.trim()) return 'username_missing';
  if (usernameError(username.value)) return 'username_invalid';
  if (availability.state.value === 'taken') return 'username_taken';
  if (availability.state.value === 'checking') return 'username_checking';
  return termsAccepted.value ? null : 'terms_unchecked';
});
const signupBlocked = computed(() => creating.value && signupBlock.value !== null);
// Each display of the sign-up form ends either in a submission or in an abandonment, reported with what still blocked it.
let signupViewOpen = false;
function startSignupView() {
  // A signed-in visitor is sent on to the workspace and never sees the form.
  signupViewOpen = creating.value && !canUseWorkspace(auth);
  if (signupViewOpen) track('signup_form_viewed', { redirect: safeReturnPath(route.query.redirect).split(/[?#]/)[0] });
}
function endSignupView(transport?: 'sendBeacon') {
  if (!signupViewOpen) return;
  signupViewOpen = false;
  // An untouched form is a bounce, already visible in the funnel.
  if (username.value.trim() || email.value.trim() || password.value || termsAccepted.value)
    track('signup_abandoned', { blocked_by: signupBlock.value }, transport ? { transport } : undefined);
}
const leavePage = () => endSignupView('sendBeacon');
startSignupView();
onMounted(() => window.addEventListener('pagehide', leavePage));
onBeforeUnmount(() => { alive = false; window.removeEventListener('pagehide', leavePage); endSignupView(); password.value = ''; });
watch(() => canUseWorkspace(auth), verified => { if (verified) void router.replace(safeReturnPath(route.query.redirect)); }, { immediate: true });
watch(() => route.query.mode, mode => {
  endSignupView();
  creating.value = mode === 'signup'; password.value = ''; error.value = ''; message.value = ''; termsAccepted.value = false;
  sentTo.value = ''; unconfirmed.value = false; resendMessage.value = ''; resendError.value = '';
  startSignupView();
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
  busy.value = true; error.value = ''; message.value = ''; unconfirmed.value = false;
  const signingUp = creating.value;
  if (signingUp) { signupViewOpen = false; track('signup_submitted', {}); }
  try {
    await auth.initialize();
    const client = authService.getClient();
    if (!auth.enabled || !client) throw new Error('La connexion utilisateur n’est pas encore activée.');
    const credentials = { email: email.value.trim(), password: password.value };
    const result = creating.value
      ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: confirmRedirect(),
          data: { username: username.value.trim(), terms_version: CURRENT_TERMS_VERSION } } })
      : await client.auth.signInWithPassword(credentials);
    if (!alive) return;
    if (result.error) {
      track(signingUp ? 'signup_failed' : 'login_failed', { reason: result.error.code ?? 'unknown' });
      if (!creating.value && result.error.code === 'email_not_confirmed') {
        unconfirmed.value = true;
        error.value = 'Votre adresse e-mail n’est pas encore confirmée. Cliquez sur le lien reçu par e-mail, ou demandez-en un nouveau.';
      } else error.value = creating.value ? signupError(result.error) : 'Connexion impossible. Vérifiez vos identifiants et la confirmation de votre adresse.';
      return;
    }
    password.value = '';
    if (signingUp) track('signup_succeeded', { confirmation_required: !result.data.session });
    if (creating.value && !result.data.session) {
      sentTo.value = credentials.email;
    } else {
      await auth.refreshAccount();
      if (!signingUp) track(auth.signedIn ? 'login_succeeded' : 'login_failed', auth.signedIn ? {} : { reason: 'session_unverified' });
      if (alive && auth.signedIn) await router.replace(safeReturnPath(route.query.redirect));
      else if (alive) error.value = auth.error ?? 'La session n’a pas pu être vérifiée. Réessayez.';
    }
  } catch {
    track(signingUp ? 'signup_failed' : 'login_failed', { reason: 'unavailable' });
    if (alive) error.value = 'La connexion est indisponible. Réessayez dans un instant.';
  } finally { if (alive) busy.value = false; }
}
/** Sends the confirmation link again (Supabase applies its own rate limit). */
async function resendConfirmation() {
  const address = sentTo.value || email.value.trim();
  if (resending.value || !address) return;
  resending.value = true; resendMessage.value = ''; resendError.value = '';
  try {
    const result = await authService.getClient()!.auth.resend({ type: 'signup', email: address, options: { emailRedirectTo: confirmRedirect() } });
    if (!alive) return;
    if (result.error) resendError.value = rateLimitError(result.error) ?? 'Envoi impossible. Réessayez dans quelques minutes.';
    else resendMessage.value = uiFormat`Un nouveau lien a été envoyé à ${address}.`;
  } catch { if (alive) resendError.value = 'Le service est indisponible. Réessayez dans un instant.'; }
  finally { if (alive) resending.value = false; }
}
/** After confirming, sign in with the same address. */
function goToSignIn() {
  email.value = sentTo.value || email.value;
  const { mode: _mode, ...query } = route.query;
  void router.replace({ name: 'login', query });
}
function editAddress() { sentTo.value = ''; resendMessage.value = ''; resendError.value = ''; }
function switchMode() {
  const { mode: _mode, ...query } = route.query;
  void router.replace({ name: 'login', query: { ...query, ...(creating.value ? {} : { mode: 'signup' }) } });
}
</script>

<template>
  <section class="account-page">
    <div class="account-panel">
      <h2 ref="heading" tabindex="-1">{{ uiText(sentTo ? 'Vérifiez votre boîte mail' : creating ? 'Créer un compte' : 'Se connecter') }}</h2>
      <div v-if="sentTo" class="account-sent">
        <Icon icon="mdi:email-check-outline" width="40" height="40" class="account-sent__icon" aria-hidden="true" />
        <p role="status">{{ uiText("Votre compte est créé. Nous avons envoyé un lien de confirmation à") }} <strong>{{ sentTo }}</strong>.</p>
        <ol class="account-sent__steps">
          <li>{{ uiText("Ouvrez l’e-mail « Confirmez votre adresse e-mail — Universal Timeline ».") }}</li>
          <li>{{ uiText("Cliquez sur « Confirmer mon adresse ».") }}</li>
          <li>{{ uiText("Connectez-vous avec votre adresse et votre mot de passe.") }}</li>
        </ol>
        <p class="account-sent__hint">{{ uiText("Rien reçu après quelques minutes ? Regardez dans le dossier des indésirables, ou renvoyez l’e-mail.") }}</p>
        <p v-if="resendMessage" role="status">{{ uiText(resendMessage) }}</p>
        <p v-if="resendError" role="alert">{{ uiText(resendError) }}</p>
        <Button @click="goToSignIn">{{ uiText("J’ai confirmé, me connecter") }}</Button>
        <Button variant="secondary" :disabled="resending" @click="resendConfirmation">{{ uiText(resending ? 'Envoi…' : 'Renvoyer l’e-mail') }}</Button>
        <Button variant="ghost" @click="editAddress">{{ uiText("Corriger l’adresse e-mail") }}</Button>
      </div>
      <template v-else>
      <p>{{ uiText("La timeline et la recherche sont accessibles à tous. Connectez-vous pour gérer vos frises.") }}</p>
      <p v-if="auth.error" role="alert">{{ uiText(auth.error) }} <Button size="sm" @click="auth.initialize">{{ uiText("Réessayer") }}</Button></p>
      <p v-if="auth.enabled === false" role="status">{{ uiText("La connexion utilisateur sera disponible après la mise en place des accès.") }}</p>
      <form v-else @submit.prevent="submit" :aria-busy="busy">
        <Input v-if="creating" id="account-username" v-model="username" :label="uiText('Nom d’utilisateur')" name="username" autocomplete="username" required
          :maxlength="USERNAME_MAX" :disabled="busy" :error="availability.message.value"
          :hint="availability.hint.value || 'Unique, il signe vos frises. Lettres sans accent, chiffres, « _ », « . » ou « - ».'" />
        <Input id="account-email" v-model="email" :label="uiText('Adresse e-mail')" type="email" name="email" autocomplete="email" required :disabled="busy" />
        <Input :label="uiText('Mot de passe')" id="account-password" v-model="password" type="password" name="password" :autocomplete="creating ? 'new-password' : 'current-password'" :minlength="creating ? 8 : undefined" :aria-describedby="creating ? 'account-password-hint' : undefined" required :disabled="busy" />
        <p v-if="creating" id="account-password-hint">{{ uiText("Au moins 8 caractères. Utilisez un mot de passe unique ; les mots de passe trop faibles ou compromis sont refusés.") }}</p>
        <label v-if="creating" class="account-terms">
          <input v-model="termsAccepted" type="checkbox" required :disabled="busy" />
          <span>{{ uiText("J’ai au moins 15 ans (ou l’accord d’un parent), j’accepte les") }} <RouterLink :to="{ name: 'legal', params: { page: 'conditions' } }" target="_blank">{{ uiText("conditions d’utilisation") }}</RouterLink> {{ uiText("et j’ai lu la") }} <RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }" target="_blank">{{ uiText("politique de confidentialité") }}</RouterLink>.</span>
        </label>
        <p v-if="error" role="alert">{{ uiText(error) }}</p>
        <Button v-if="unconfirmed" variant="secondary" size="sm" :disabled="resending || !email.trim()" @click="resendConfirmation">{{ uiText(resending ? 'Envoi…' : 'Renvoyer le lien de confirmation') }}</Button>
        <p v-if="resendMessage" role="status">{{ uiText(resendMessage) }}</p>
        <p v-if="resendError" role="alert">{{ uiText(resendError) }}</p>
        <p v-if="message" role="status">{{ uiText(message) }}</p>
        <Button type="submit" :disabled="busy || !auth.ready || signupBlocked">{{ uiText(busy ? 'Veuillez patienter…' : creating ? 'Créer mon compte' : 'Se connecter') }}</Button>
        <Button variant="ghost" :disabled="busy" @click="switchMode">{{ uiText(creating ? 'J’ai déjà un compte' : 'Créer un compte') }}</Button>
        <RouterLink v-if="!creating" class="account-forgot" :to="{ name: 'password-reset', query: email.trim() ? { email: email.trim() } : {} }">{{ uiText("Mot de passe oublié ?") }}</RouterLink>
      </form>
      </template>
      <RouterLink to="/timeline">{{ uiText("Revenir à la timeline") }}</RouterLink>
      <nav class="account-legal" :aria-label="uiText('Informations légales')">
        <RouterLink :to="{ name: 'legal', params: { page: 'mentions-legales' } }">{{ uiText("Mentions légales") }}</RouterLink>
        <RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }">{{ uiText("Confidentialité") }}</RouterLink>
        <RouterLink :to="{ name: 'legal', params: { page: 'cookies' } }">{{ uiText("Cookies") }}</RouterLink>
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
.account-sent { display: flex; flex-direction: column; gap: var(--spacing-sm); margin: var(--spacing-lg) 0; }
.account-sent p { margin: 0; }
.account-sent__icon { color: var(--color-text-link); }
.account-sent__steps { margin: 0; padding-left: var(--spacing-lg); }
.account-sent__steps li + li { margin-top: var(--spacing-xs); }
.account-sent__hint { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
h2:focus { outline: none; }
.account-forgot { align-self: center; font-size: var(--font-size-sm); }
.account-legal { display: flex; flex-wrap: wrap; gap: var(--spacing-md); margin-top: var(--spacing-lg); font-size: var(--font-size-xs); }
</style>
