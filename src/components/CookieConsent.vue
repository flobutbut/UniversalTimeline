<template>
  <section v-if="consent.needsDecision || consent.preferencesOpen" class="cookie-consent" aria-labelledby="cookie-consent-title">
    <PopoverSurface padded class="cookie-consent__surface">
      <h2 id="cookie-consent-title" class="cookie-consent__title">Cookies et mesure d’audience</h2>
      <p class="cookie-consent__text">
        Les cookies nécessaires (session de connexion, préférences d’affichage) sont toujours actifs.
        Sans cookie, nous comptons les visites de façon anonyme, une visite à la fois. Avec votre accord, nous mesurons aussi
        l’audience d’une visite à l’autre pour améliorer le site. Vous pouvez changer d’avis à tout moment depuis
        <RouterLink :to="{ name: 'legal', params: { page: 'cookies' } }">la politique cookies</RouterLink>.
      </p>
      <fieldset v-if="customizing" class="cookie-consent__choices">
        <legend class="sr-only">Choix par finalité</legend>
        <Switch :model-value="true" label="Nécessaires (toujours actifs)" disabled />
        <Switch v-model="analytics" label="Mesure d’audience avec cookies" />
        <Switch v-model="anonymous" label="Mesure anonyme sans cookie" :disabled="analytics" />
        <p class="cookie-consent__note">{{ analytics ? 'Incluse dans la mesure d’audience que vous acceptez.' : 'Ne nécessite pas votre accord ; vous pouvez vous y opposer.' }}</p>
      </fieldset>
      <div class="cookie-consent__actions">
        <Button variant="secondary" size="sm" @click="consent.rejectAll">Tout refuser</Button>
        <Button v-if="!customizing" variant="secondary" size="sm" @click="customizing = true">Personnaliser</Button>
        <Button v-else variant="secondary" size="sm" @click="consent.save(analytics, analytics || anonymous)">Enregistrer mes choix</Button>
        <Button variant="secondary" size="sm" @click="consent.acceptAll">Tout accepter</Button>
        <Button v-if="!consent.needsDecision" variant="ghost" size="sm" @click="consent.closePreferences">Fermer</Button>
      </div>
      <p v-if="!consent.trackingConfigured" class="cookie-consent__note" role="status">Aucun traceur de mesure d’audience n’est actif pour le moment.</p>
    </PopoverSurface>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import Button from './base/Button.vue';
import Switch from './base/Switch.vue';
import PopoverSurface from './base/PopoverSurface.vue';
import { useConsentStore } from '@/stores/useConsentStore';

const consent = useConsentStore();
const customizing = ref(false);
const analytics = ref(consent.choice?.analytics ?? false);
const anonymous = ref(consent.choice?.anonymous ?? true);
// Opened from the cookie policy or the profile: show the current choice, ready to change.
watch(() => consent.preferencesOpen, open => {
  if (!open) return;
  customizing.value = true; analytics.value = consent.choice?.analytics ?? false; anonymous.value = consent.choice?.anonymous ?? true;
});
</script>

<style scoped>
/* Non-modal: the page stays usable; refusing is as easy as accepting (equal buttons). */
.cookie-consent { position: fixed; inset: auto var(--spacing-md) var(--spacing-md) auto; z-index: var(--z-index-fixed); width: min(440px, calc(100vw - 2 * var(--spacing-md))); }
.cookie-consent__surface { display: flex; flex-direction: column; gap: var(--spacing-sm); padding: var(--spacing-lg); }
.cookie-consent__title { margin: 0; font-size: var(--font-size-base); }
.cookie-consent__text, .cookie-consent__note { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.cookie-consent__choices { display: flex; flex-direction: column; gap: var(--spacing-sm); margin: 0; padding: 0; border: 0; }
.cookie-consent__actions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); justify-content: flex-end; }
</style>
