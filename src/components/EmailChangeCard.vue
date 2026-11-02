<template>
  <form class="email-change" aria-labelledby="email-change-title" @submit.prevent="submit">
    <h3 id="email-change-title">Adresse e-mail</h3>
    <p>Adresse actuelle : <strong>{{ email ?? '—' }}</strong></p>
    <p v-if="pendingEmail" class="email-change__pending" role="status">
      Changement en attente vers <strong>{{ pendingEmail }}</strong> : confirmez-le depuis le lien reçu par e-mail.
    </p>
    <template v-if="editing">
      <Input id="email-change-input" v-model="draft" label="Nouvelle adresse e-mail" type="email" name="email" autocomplete="email" required :disabled="busy"
        hint="Un lien de confirmation est envoyé à la nouvelle adresse, et selon la configuration aussi à l’adresse actuelle. L’adresse change une fois le lien confirmé." />
      <p v-if="error" class="email-change__error" role="alert">{{ error }}</p>
      <div class="email-change__actions">
        <Button type="button" variant="secondary" size="sm" :disabled="busy" @click="cancel">Annuler</Button>
        <Button type="submit" size="sm" :disabled="busy || !draft.trim()">{{ busy ? 'Envoi…' : 'Envoyer le lien de confirmation' }}</Button>
      </div>
    </template>
    <div v-else class="email-change__actions">
      <Button type="button" variant="secondary" size="sm" :disabled="!email" @click="editing = true">Changer d’adresse</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import { authService } from '@/services/AuthService';
import { useToast } from '@/composables/useToast';
import { emailChangeError } from '@/lib/authErrors';

const props = defineProps<{ email: string | null; pendingEmail: string | null }>();
const emit = defineEmits<{ requested: [] }>();
const toast = useToast();
const editing = ref(false); const draft = ref(''); const busy = ref(false); const error = ref(''); let alive = true;
onBeforeUnmount(() => { alive = false; });

function cancel() { editing.value = false; draft.value = ''; error.value = ''; }

async function submit() {
  const next = draft.value.trim();
  if (busy.value || !next) return;
  if (next.toLowerCase() === props.email?.toLowerCase()) { error.value = 'C’est déjà l’adresse de votre compte.'; return; }
  busy.value = true; error.value = '';
  try {
    const client = authService.getClient();
    if (!client) throw new Error('disabled');
    const result = await client.auth.updateUser({ email: next }, { emailRedirectTo: `${window.location.origin}/profile` });
    if (!alive) return;
    if (result.error) { error.value = emailChangeError(result.error); return; }
    toast.show(`Lien de confirmation envoyé à ${next}.`, 'success');
    cancel(); emit('requested');
  } catch { if (alive) error.value = 'Le service est indisponible. Réessayez dans un instant.'; }
  finally { if (alive) busy.value = false; }
}
</script>

<style scoped>
.email-change {
  display: flex; flex-direction: column; gap: var(--spacing-md); margin: 0; padding: var(--spacing-lg);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default);
}
.email-change h3 { margin: 0; font-size: var(--font-size-base); }
.email-change p { margin: 0; max-width: 72ch; overflow-wrap: anywhere; }
.email-change__pending { padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); background: var(--color-status-warning-background); }
.email-change__error { color: var(--color-status-error-foreground); }
.email-change__actions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); justify-content: flex-end; }
</style>
