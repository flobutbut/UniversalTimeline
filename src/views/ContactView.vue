<template>
  <SidebarLayout menu-label="Informations légales" :items="legalMenu" active="contact">
    <article class="contact-view" aria-labelledby="contact-title">
      <header>
        <h2 id="contact-title">Contact</h2>
        <p class="contact-view__meta">Une question, un signalement ou une demande sur vos données : écrivez-nous, nous vous répondons par e-mail.</p>
      </header>
      <section class="contact-view__address" aria-labelledby="contact-address-title">
        <h3 id="contact-address-title">Adresse</h3>
        <p><a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a></p>
        <div><Button variant="secondary" size="sm" @click="copyAddress">Copier l’adresse</Button></div>
      </section>
      <section aria-labelledby="contact-topics-title">
        <h3 id="contact-topics-title">Choisir le sujet</h3>
        <p class="contact-view__meta">Chaque lien ouvre votre messagerie avec un objet et un modèle de message, à compléter avant l’envoi.</p>
        <ul class="contact-view__topics">
          <li v-for="topic in topics" :key="topic.subject" class="contact-view__topic">
            <h4>{{ topic.title }}</h4>
            <p>{{ topic.description }}</p>
            <RouterLink v-if="topic.hint" :to="topic.hint.to">{{ topic.hint.label }}</RouterLink>
            <a :href="mailto(topic)">Écrire : « {{ topic.subject }} »</a>
          </li>
        </ul>
      </section>
      <p class="contact-view__meta">
        Nous n’utilisons votre adresse et votre message que pour vous répondre. Voir la
        <RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }">politique de confidentialité</RouterLink>.
      </p>
    </article>
  </SidebarLayout>
</template>

<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Button from '@/components/base/Button.vue';
import SidebarLayout from '@/components/base/SidebarLayout.vue';
import { CONTACT_EMAIL, legalMenu } from '@/lib/legalDocuments';
import { useToast } from '@/composables/useToast';

interface ContactTopic { title: string; description: string; subject: string; body: string; hint?: { label: string; to: RouteLocationRaw } }

const topics: ContactTopic[] = [
  { title: 'Question ou suggestion', subject: 'Question', description: 'Une idée de frise, une remarque sur le site ou une question sur son fonctionnement.',
    body: 'Bonjour,\n\n' },
  { title: 'Signaler un contenu', subject: 'Signalement', description: 'Une frise publique vous semble illicite, erronée ou porte atteinte à vos droits.',
    body: 'Bonjour,\n\nAdresse de la frise concernée :\nCe qui pose problème :\n' },
  { title: 'Données personnelles', subject: 'Données personnelles', description: 'Exercer vos droits (accès, rectification, effacement, opposition…). Nous répondons sous un mois.',
    body: 'Bonjour,\n\nMa demande concerne :\nAdresse e-mail de mon compte (le cas échéant) :\n',
    hint: { label: 'Export et suppression du compte sont aussi disponibles dans votre profil', to: { name: 'profile', query: { section: 'privacy' } } } },
  { title: 'Problème technique', subject: 'Problème technique', description: 'Une page qui ne s’affiche pas, une erreur, une inscription ou une connexion qui échoue.',
    body: 'Bonjour,\n\nPage concernée :\nCe que j’ai fait :\nCe qui s’est passé :\nNavigateur et appareil :\n' },
];

const mailto = (topic: ContactTopic) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[Universal Timeline] ${topic.subject}`)}&body=${encodeURIComponent(topic.body)}`;

const toast = useToast();
async function copyAddress() {
  try { await navigator.clipboard.writeText(CONTACT_EMAIL); toast.show('Adresse copiée.', 'success'); }
  catch { toast.show(`Copie impossible : sélectionnez l’adresse ${CONTACT_EMAIL}.`, 'error'); }
}
</script>

<style scoped>
.contact-view { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.contact-view h2 { margin: 0; font-size: var(--font-size-xl); }
.contact-view h3 { margin: 0 0 var(--spacing-sm); font-size: var(--font-size-base); }
.contact-view h4 { margin: 0; font-size: var(--font-size-base); }
.contact-view p { margin: 0 0 var(--spacing-sm); max-width: 72ch; }
.contact-view__meta { color: var(--color-text-secondary); }
.contact-view__address { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.contact-view__address a { font-size: var(--font-size-lg); }
.contact-view__topics { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--spacing-md); margin: 0; padding: 0; list-style: none; }
.contact-view__topic {
  display: flex; flex-direction: column; gap: var(--spacing-sm); padding: var(--spacing-lg);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default);
}
.contact-view__topic p { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.contact-view__topic a { font-size: var(--font-size-sm); overflow-wrap: anywhere; }
</style>
