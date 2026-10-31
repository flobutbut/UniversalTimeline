<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import Button from '@/components/base/Button.vue';
import { authService } from '@/services/AuthService';
import { useAuthStore } from '@/stores/useAuthStore';
import { canUseWorkspace, safeReturnPath } from '@/router/access';

const auth = useAuthStore(); const route = useRoute(); const router = useRouter();
const email = ref(''); const password = ref(''); const creating = ref(route.query.mode === 'signup');
const busy = ref(false); const error = ref(''); const message = ref(''); let alive = true;
onBeforeUnmount(() => { alive = false; password.value = ''; });
watch(() => canUseWorkspace(auth), verified => { if (verified) void router.replace(safeReturnPath(route.query.redirect)); }, { immediate: true });
watch(() => route.query.mode, mode => {
  creating.value = mode === 'signup'; password.value = ''; error.value = ''; message.value = '';
});

function signupError(providerError: { code?: string; name?: string }): string {
  if (providerError.code === 'weak_password' || providerError.name === 'AuthWeakPasswordError') {
    return 'Ce mot de passe est trop faible ou figure parmi les mots de passe compromis. Choisissez un mot de passe unique et plus robuste.';
  }
  switch (providerError.code) {
    case 'email_address_not_authorized':
      return 'Le service d’e-mail du projet n’autorise pas encore les inscriptions avec cette adresse. Sa configuration doit être complétée.';
    case 'over_email_send_rate_limit':
      return 'La limite d’envoi des e-mails de confirmation est atteinte. Réessayez plus tard.';
    case 'over_request_rate_limit':
      return 'Trop de tentatives rapprochées. Patientez quelques minutes avant de réessayer.';
    case 'email_address_invalid':
      return 'Cette adresse e-mail n’est pas acceptée par le service d’inscription. Vérifiez-la ou utilisez une autre adresse.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'Les inscriptions par e-mail sont actuellement désactivées.';
    default:
      return 'Création du compte impossible. Vérifiez les champs ou réessayez plus tard.';
  }
}

async function submit() {
  if (busy.value) return;
  busy.value = true; error.value = ''; message.value = '';
  try {
    await auth.initialize();
    const client = authService.getClient();
    if (!auth.enabled || !client) throw new Error('La connexion utilisateur n’est pas encore activée.');
    const credentials = { email: email.value.trim(), password: password.value };
    const result = creating.value
      ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/login` } })
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
        <label for="account-email">Adresse e-mail</label>
        <input id="account-email" v-model="email" type="email" name="email" autocomplete="email" required :disabled="busy" />
        <label for="account-password">Mot de passe</label>
        <input id="account-password" v-model="password" type="password" name="password" :autocomplete="creating ? 'new-password' : 'current-password'" :minlength="creating ? 8 : undefined" :aria-describedby="creating ? 'account-password-hint' : undefined" required :disabled="busy" />
        <p v-if="creating" id="account-password-hint">Au moins 8 caractères. Utilisez un mot de passe unique ; les mots de passe trop faibles ou compromis sont refusés.</p>
        <p v-if="error" role="alert">{{ error }}</p>
        <p v-if="message" role="status">{{ message }}</p>
        <Button type="submit" :disabled="busy || !auth.ready">{{ busy ? 'Veuillez patienter…' : creating ? 'Créer mon compte' : 'Se connecter' }}</Button>
        <Button variant="ghost" :disabled="busy" @click="switchMode">{{ creating ? 'J’ai déjà un compte' : 'Créer un compte' }}</Button>
      </form>
      <RouterLink to="/timeline">Revenir à la timeline</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.account-page { overflow: auto; padding: var(--spacing-lg); box-sizing: border-box; }
.account-panel { max-width: 28rem; margin: 2rem auto; padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
h2 { margin-top: 0; }
form { display: flex; flex-direction: column; gap: var(--spacing-sm); margin: var(--spacing-lg) 0; }
input { box-sizing: border-box; min-width: 0; width: 100%; padding: var(--spacing-md); color: var(--color-text); background: var(--color-background); border: 1px solid var(--color-border); border-radius: var(--radius-md); font: inherit; }
</style>
