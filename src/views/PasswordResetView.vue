<script setup lang="ts">
import { uiText } from "@/i18n";
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import { authService } from '@/services/AuthService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/composables/useToast';
import { passwordUpdateError, rateLimitError } from '@/lib/authErrors';

/**
 * Forgotten password. Without a token: ask for the e-mail (neutral answer, accounts are not revealed).
 * With the recovery link (token_hash, valid in any browser): open a recovery session, then choose a new password.
 */
type Phase = 'request' | 'sent' | 'verifying' | 'choose' | 'invalid';
const auth = useAuthStore(); const route = useRoute(); const router = useRouter(); const toast = useToast();
const tokenHash = typeof route.query.token_hash === 'string' && route.query.type === 'recovery' ? route.query.token_hash : '';
const phase = ref<Phase>(tokenHash ? 'verifying' : 'request');
const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const password = ref(''); const confirmation = ref('');
const busy = ref(false); const error = ref(''); let alive = true;
onBeforeUnmount(() => { alive = false; password.value = ''; confirmation.value = ''; });

async function client() {
  await auth.initialize();
  const sdk = authService.getClient();
  if (!auth.enabled || !sdk) throw new Error('disabled');
  return sdk;
}

onMounted(async () => {
  if (!tokenHash) return;
  // The single-use token leaves the address bar (and history) before anything else.
  void router.replace({ name: 'password-reset' });
  try {
    const result = await (await client()).auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    if (alive) phase.value = result.error ? 'invalid' : 'choose';
  } catch { if (alive) phase.value = 'invalid'; }
});

async function requestLink() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    const result = await (await client()).auth.resetPasswordForEmail(email.value.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (!alive) return;
    if (result.error) error.value = rateLimitError(result.error) ?? 'Envoi impossible. Vérifiez l’adresse ou réessayez plus tard.';
    else phase.value = 'sent';
  } catch { if (alive) error.value = 'Le service est indisponible. Réessayez dans un instant.'; }
  finally { if (alive) busy.value = false; }
}

async function choosePassword() {
  if (busy.value) return;
  if (password.value !== confirmation.value) { error.value = 'Les deux mots de passe sont différents.'; return; }
  busy.value = true; error.value = '';
  try {
    const result = await (await client()).auth.updateUser({ password: password.value });
    if (!alive) return;
    if (result.error) { error.value = passwordUpdateError(result.error); return; }
    password.value = ''; confirmation.value = '';
    await auth.refreshAccount();
    toast.show('Mot de passe modifié. Vous êtes connecté.', 'success');
    await router.replace('/database');
  } catch { if (alive) error.value = 'Le service est indisponible. Réessayez dans un instant.'; }
  finally { if (alive) busy.value = false; }
}

function restart() { phase.value = 'request'; error.value = ''; }
</script>

<template>
  <section class="account-page">
    <div class="account-panel">
      <h2>{{ uiText(phase === 'choose' ? 'Choisir un nouveau mot de passe' : 'Mot de passe oublié') }}</h2>
      <p v-if="auth.enabled === false" role="status">{{ uiText("La connexion utilisateur sera disponible après la mise en place des accès.") }}</p>

      <form v-else-if="phase === 'request'" :aria-busy="busy" @submit.prevent="requestLink">
        <p>{{ uiText("Indiquez l’adresse de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.") }}</p>
        <Input id="reset-email" v-model="email" :label="uiText('Adresse e-mail')" type="email" name="email" autocomplete="email" required :disabled="busy" />
        <p v-if="error" role="alert">{{ uiText(error) }}</p>
        <Button type="submit" :disabled="busy || !email.trim()">{{ uiText(busy ? 'Envoi…' : 'Recevoir le lien') }}</Button>
      </form>

      <div v-else-if="phase === 'sent'" class="account-step" role="status">
        <p>{{ uiText("Si un compte existe pour") }} <strong>{{ email.trim() }}</strong>{{ uiText(", un e-mail vient de lui être envoyé. Le lien est valable une seule fois et pendant une durée limitée.") }}</p>
        <p>{{ uiText("Rien reçu après quelques minutes ? Vérifiez le dossier des indésirables, puis") }} <Button variant="tertiary" size="sm" @click="restart">{{ uiText("renvoyez un lien") }}</Button>.</p>
      </div>

      <p v-else-if="phase === 'verifying'" role="status">{{ uiText("Vérification du lien…") }}</p>

      <div v-else-if="phase === 'invalid'" class="account-step">
        <p role="alert">{{ uiText("Ce lien n’est plus valable : il a déjà servi ou a expiré.") }}</p>
        <Button @click="restart">{{ uiText("Demander un nouveau lien") }}</Button>
      </div>

      <form v-else :aria-busy="busy" @submit.prevent="choosePassword">
        <Input id="reset-password" v-model="password" :label="uiText('Nouveau mot de passe')" type="password" name="new-password" autocomplete="new-password"
          :minlength="8" aria-describedby="reset-password-hint" required :disabled="busy" />
        <p id="reset-password-hint">{{ uiText("Au moins 8 caractères. Utilisez un mot de passe unique ; les mots de passe trop faibles ou compromis sont refusés.") }}</p>
        <Input id="reset-password-confirmation" v-model="confirmation" :label="uiText('Confirmer le mot de passe')" type="password" name="new-password-confirmation"
          autocomplete="new-password" :minlength="8" required :disabled="busy" />
        <p v-if="error" role="alert">{{ uiText(error) }}</p>
        <Button type="submit" :disabled="busy || !password || !confirmation">{{ uiText(busy ? 'Enregistrement…' : 'Enregistrer le mot de passe') }}</Button>
      </form>

      <RouterLink :to="{ name: 'login' }">{{ uiText("Revenir à la connexion") }}</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.account-page { overflow: auto; padding: var(--spacing-lg); box-sizing: border-box; }
.account-panel { max-width: 28rem; margin: 2rem auto; padding: var(--spacing-lg); background: var(--color-surface-default); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); }
h2 { margin-top: 0; }
form, .account-step { display: flex; flex-direction: column; gap: var(--spacing-sm); margin: var(--spacing-lg) 0; }
form p, .account-step p { margin: 0; }
</style>
