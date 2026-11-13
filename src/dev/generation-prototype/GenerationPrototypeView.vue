<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import Select from '@/components/base/Select.vue';
import Tag from '@/components/base/Tag.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import { SearchApiService } from '@/services/SearchApiService';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { formatSearchResultDateBound } from '@/lib/formatTemporalBoundLabel';
import { loadExample, readLive } from './transport';
import { defaultSettings, description, evaluate, examples, label, profiles, propertyLabels, sourceUrl, type LabItem, type LabSettings, type LabSnapshot, type Profile, type Status } from './model';

const route = useRoute(), router = useRouter();
const snapshot = ref<LabSnapshot | null>(null);
const profile = ref<Profile>('person');
const settings = ref<LabSettings>({ ...defaultSettings });
const query = ref('');
const subjectError = ref('');
const loading = ref(false), error = ref(''), progress = ref('');
const dataMode = ref<'snapshot' | 'live'>('snapshot');
const strategy = ref<'profile' | 'baseline'>('profile');
const filter = ref<Status | 'all'>('retained');
const tab = ref<'list' | 'timeline' | 'comparison'>('list');
const focusedItem = ref<string | null>(null);
const manual = ref(new Map<string, boolean>());
const requests = useLatestRequest();
let controller: AbortController | undefined;
const search = useDebouncedSearch(() => query.value, (q, signal) => SearchApiService.getInstance().searchWikidataEntityLabels(q, { signal }), { delayMs: 600, enabled: () => !/^Q[1-9]\d*$/i.test(query.value.trim()) });
watch(query, () => { subjectError.value = ''; });
const currentQid = computed(() => typeof route.query.wikidata === 'string' ? route.query.wikidata.toUpperCase() : 'Q5593');
const items = computed(() => snapshot.value ? evaluate(snapshot.value, profile.value, settings.value) : []);
const retained = computed(() => items.value.filter(i => i.status === 'retained'));
const review = computed(() => items.value.filter(i => i.status === 'review'));
const excluded = computed(() => items.value.filter(i => i.status === 'excluded'));
const visible = computed(() => filter.value === 'all' ? items.value : items.value.filter(i => i.status === filter.value));
const selectable = (item: LabItem) => item.status !== 'excluded' && item.start?.order != null && (item.end?.order == null || item.start.order <= item.end.order);
const selected = computed(() => items.value.filter(i => selectable(i) && (manual.value.get(i.id) ?? i.status === 'retained')));
const selectedIds = computed(() => new Set(selected.value.map(i => i.id)));
const baselineItems = computed(() => snapshot.value?.baseline?.items ?? []);
const baselineSelected = computed(() => baselineItems.value.filter(i => i.selected));
const title = computed(() => label(snapshot.value?.entities[currentQid.value], examples.find(e => e.qid === currentQid.value)?.label ?? currentQid.value));
const subtitle = computed(() => description(snapshot.value?.entities[currentQid.value]));
const activeProfile = computed(() => profiles.find(p => p.value === profile.value)!);
const modifiedProfile = computed(() => snapshot.value && profile.value !== snapshot.value.profile);
const dateFormat = (date: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
const statusLabel: Record<Status, string> = { retained: 'Proposé', review: 'À vérifier', excluded: 'Écarté' };
const statusVariant = (status: Status) => status === 'retained' ? 'success' : status === 'review' ? 'warning' : 'neutral';
const counts = computed(() => [
  { value: 'retained' as const, label: 'Proposés', count: retained.value.length },
  { value: 'review' as const, label: 'À vérifier', count: review.value.length },
  { value: 'excluded' as const, label: 'Écartés', count: excluded.value.length },
  { value: 'all' as const, label: 'Tous', count: items.value.length },
]);
const timelineBounds = computed(() => {
  const values = selected.value.flatMap(i => [i.start?.order, i.end?.order]).filter((n): n is number => n != null);
  const min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 1;
  return { min, max: max === min ? min + 1 : max };
});
const timelineEnd = computed(() => [...selected.value].sort((a,b)=>(b.end?.order??b.start?.order??0)-(a.end?.order??a.start?.order??0))[0]);
function itemStyle(item: LabItem) {
  const { min, max } = timelineBounds.value;
  const left = ((item.start?.order ?? min) - min) / (max - min) * 100;
  const right = ((item.end?.order ?? item.start?.order ?? min) - min) / (max - min) * 100;
  return { left: `${left}%`, width: item.type === 'period' && item.end ? `${Math.max(0.5, right - left)}%` : undefined };
}
function choose(qid: string, family?: Profile) {
  query.value = '';
  void router.push({ name: 'generation-prototype', query: { wikidata: qid, family: family ?? profile.value } });
}
function submitSubject() {
  const qid = query.value.trim().replace(/^wikidata:/i, '').toUpperCase();
  if (/^Q[1-9]\d*$/.test(qid)) choose(qid);
  else if (search.results.value[0]) choose(search.results.value[0].id);
  else subjectError.value = 'Choisissez un résultat de recherche, ou saisissez un Q-id valide (ex. Q5593).';
}
async function load(live: boolean) {
  controller?.abort(); const active = new AbortController(); controller = active;
  const isCurrent = requests.begin();
  loading.value = true; error.value = ''; progress.value = live ? 'Connexion à Wikidata…' : 'Ouverture de l’exemple…';
  try {
    const data = live
      ? await readLive(currentQid.value, profile.value, active.signal, text => { if (isCurrent()) progress.value = text; })
      : await loadExample(currentQid.value);
    if (!isCurrent()) return;
    snapshot.value = data; dataMode.value = live ? 'live' : 'snapshot';
    manual.value = new Map(); focusedItem.value = null;
  } catch (cause) {
    if (isCurrent() && !active.signal.aborted) error.value = cause instanceof Error ? cause.message : 'Lecture impossible. Réessayez.';
  } finally { if (isCurrent()) loading.value = false; }
}
function cancel() { controller?.abort(); requests.cancel(); loading.value = false; }
watch(() => [route.query.wikidata, route.query.family], () => {
  cancel(); snapshot.value = null; error.value = '';
  const family = route.query.family;
  profile.value = profiles.some(p => p.value === family) ? family as Profile : examples.find(e => e.qid === currentQid.value)?.profile ?? 'history';
  strategy.value = 'profile'; filter.value = 'retained'; tab.value = 'list';
  void load(!examples.some(e => e.qid === currentQid.value));
}, { immediate: true });
onScopeDispose(() => controller?.abort());
function toggle(item: LabItem, event: Event) { manual.value.set(item.id, (event.target as HTMLInputElement).checked); }
function selectAll(value: boolean) { for (const item of items.value) manual.value.set(item.id, value && item.status === 'retained'); }
function focusItem(item: LabItem) { focusedItem.value = item.id; filter.value = 'all'; tab.value = 'list'; }
function exportSelection() {
  if (!snapshot.value) return;
  const result = { prototype: true, subject: currentQid.value, title: title.value, profile: profile.value, settings: settings.value, source: dataMode.value, capturedAt: snapshot.value.capturedAt, coverageLimited: snapshot.value.truncated, notices: snapshot.value.notices ?? [], items: selected.value };
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `frise-prototype-${currentQid.value}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <div class="generation-lab">
    <header class="lab-heading">
      <div><div class="lab-eyebrow"><span class="lab-dot" />{{ uiText("ATELIER WIKIDATA") }} <Tag :label="uiText('Prototype')" /></div><h1>{{ uiText("Labo de génération") }}</h1><p>{{ uiText("Explorer, comparer, puis choisir les faits qui racontent une histoire.") }}</p></div>
      <Button variant="tertiary" size="sm" :to="{ name: 'wikidata-generation', query: { wikidata: currentQid } }">{{ uiText("Génération actuelle") }} <span aria-hidden="true">↗</span></Button>
    </header>
    <div class="lab-workspace">
      <aside class="lab-sidebar" :aria-label="uiText('Sujets et règles de génération')">
        <section class="lab-sidebar-section">
          <h2>{{ uiText("Un sujet pour commencer") }}</h2>
          <nav class="lab-examples" :aria-label="uiText('Exemples de génération')">
            <button v-for="example in examples" :key="example.qid" type="button" class="lab-example" :class="{ 'lab-example--active': currentQid === example.qid }" :aria-current="currentQid === example.qid ? 'page' : undefined" @click="choose(example.qid, example.profile)">
              <span class="lab-example-icon"><Icon :icon="example.profile === 'person' ? 'mdi:palette-outline' : example.profile === 'space' ? 'mdi:rocket-launch-outline' : example.profile === 'geology' ? 'mdi:layers-triple-outline' : example.profile === 'art' ? 'mdi:brush-outline' : 'mdi:flag-outline'" /></span>
              <span><strong>{{ uiText(example.label) }}</strong><small>{{ example.hint }}</small></span><span v-if="currentQid === example.qid" class="lab-example-arrow" aria-hidden="true">→</span>
            </button>
          </nav>
        </section>
        <section class="lab-sidebar-section lab-custom">
          <h2>{{ uiText("Tester un autre sujet") }}</h2>
          <form @submit.prevent="submitSubject"><Input v-model="query" :label="uiText('Nom ou identifiant Wikidata')" :placeholder="uiText('Ex. Napoléon, Q517…')" autocomplete="off" :error="subjectError" /><Button variant="tertiary" size="sm" type="submit" :disabled="!query.trim()">{{ uiText("Ouvrir") }}</Button></form>
          <p v-if="search.loading.value" class="lab-meta" role="status">{{ uiText("Recherche Wikidata…") }}</p>
          <p v-if="search.error.value" class="lab-search-error" role="alert">{{ uiText(search.error.value) }}</p>
          <ul v-if="query.length >= 2 && search.results.value.length" class="lab-search-results" :aria-label="uiText('Sujets Wikidata trouvés')"><li v-for="hit in search.results.value.slice(0, 5)" :key="hit.id"><button type="button" @click="choose(hit.id)">{{ uiText(hit.label) }} <small>{{ hit.description || hit.id }}</small></button></li></ul>
        </section>
        <section class="lab-sidebar-section lab-rules">
          <h2>{{ uiText("Règles de l’essai") }}</h2>
          <Select v-model="profile" :label="uiText('Famille du sujet')" :options="profiles" :searchable="false" :disabled="loading" />
          <p class="lab-meta">{{ activeProfile.description }}</p>
          <label><input v-model="settings.approximate" type="checkbox" />{{ uiText("Conserver les dates approximatives") }}</label>
          <label><input v-model="settings.withinBounds" type="checkbox" />{{ uiText("Vérifier les bornes du sujet") }}</label>
          <template v-if="profile === 'person'"><label><input v-model="settings.biography" type="checkbox" />{{ uiText("Événements de vie") }}</label><label><input v-model="settings.works" type="checkbox" />{{ uiText("Œuvres majeures") }}</label></template>
          <Select v-model="settings.limit" :label="uiText('Propositions maximum')" :searchable="false" :options="[{value:20,label:'20 propositions'},{value:40,label:'40 propositions'},{value:80,label:'80 propositions'}]" />
        </section>
        <p class="lab-sidebar-footer"><Icon icon="mdi:flask-outline" />{{ uiText("Les essais restent dans ce labo.") }}<br />{{ uiText("Aucune frise n’est enregistrée.") }}</p>
      </aside>

      <section class="lab-content" :aria-label="uiText('Résultat de la génération')" :aria-busy="loading">
        <section class="lab-subject">
          <div><span class="lab-kicker">{{ uiText(activeProfile.label) }}</span><h2>{{ title }}</h2><p>{{ uiText(subtitle || 'Choisissez un sujet pour explorer les faits disponibles.') }}</p><a :href="`https://www.wikidata.org/wiki/${currentQid}`" target="_blank" rel="noopener noreferrer" class="lab-source-link">{{ currentQid }} {{ uiText("· Voir la fiche Wikidata") }} <span aria-hidden="true">↗</span></a></div>
          <Button v-if="!loading" size="sm" @click="load(true)"><template #icon><Icon icon="mdi:refresh" /></template>{{ uiText("Actualiser depuis Wikidata") }}</Button><Button v-else variant="tertiary" size="sm" @click="cancel">{{ uiText("Annuler la lecture") }}</Button>
        </section>
        <div v-if="snapshot" class="lab-data-note"><span class="lab-dot" />{{ uiText(dataMode === 'snapshot' ? 'Copie de données publiques' : 'Lecture Wikidata en direct') }} · {{ dateFormat(snapshot.capturedAt) }}<span>{{ uiText("Les règles sont appliquées à de vraies déclarations Wikidata.") }}</span></div>
        <FeedbackState v-if="loading" kind="loading" layout="inline" :message="uiText(progress)" />
        <FeedbackState v-if="error" kind="error" layout="inline" :message="uiText(error)" retryable @retry="load(true)" />
        <template v-if="snapshot">
          <div v-if="snapshot.truncated || modifiedProfile || snapshot.notices?.length" class="lab-notice" role="status">
            <Icon icon="mdi:information-outline" /><div><p v-if="snapshot.truncated">{{ uiText("Collecte limitée aux 120 premiers candidats classés. Cette frise ne prétend pas être exhaustive.") }}</p><p v-if="modifiedProfile">{{ uiText("Vous testez une autre famille sur la collecte existante. Actualisez Wikidata pour adapter aussi la recherche des candidats.") }}</p><p v-for="notice in snapshot.notices" :key="notice">{{ uiText(notice) }}</p></div>
          </div>
          <section class="lab-metrics" :aria-label="uiText('Comparaison des résultats')">
            <div><span>{{ uiText("Moteur actuel") }}</span><strong>{{ uiText(snapshot.baseline ? baselineSelected.length : '—') }}</strong><small>{{ uiText("éléments valides") }}</small></div>
            <div class="lab-metric-primary"><span>{{ uiText("Approche par famille") }}</span><strong>{{ retained.length }}</strong><small>{{ uiText("propositions retenues") }}</small></div>
            <div><span>{{ uiText("À vérifier") }}</span><strong>{{ review.length }}</strong><small>{{ uiText("dates ou contexte") }}</small></div>
            <div><span>{{ uiText("Votre sélection") }}</span><strong>{{ selected.length }}</strong><small>{{ uiText("faits dans l’aperçu") }}</small></div>
          </section>
          <nav class="lab-view-tabs" :aria-label="uiText('Présentation des résultats')">
            <button type="button" :aria-pressed="tab === 'list'" @click="tab='list'"><Icon icon="mdi:format-list-bulleted" />{{ uiText("Faits et sources") }}</button>
            <button type="button" :aria-pressed="tab === 'timeline'" @click="tab='timeline'"><Icon icon="mdi:timeline-outline" />{{ uiText("Aperçu de la frise") }}</button>
            <button type="button" :aria-pressed="tab === 'comparison'" @click="tab='comparison'"><Icon icon="mdi:compare-horizontal" />{{ uiText("Comparer les moteurs") }}</button>
          </nav>

          <section v-if="tab === 'comparison'" class="lab-comparison" :aria-label="uiText('Comparaison des moteurs')">
            <article><span class="lab-kicker">{{ uiText("Moteur actuel") }}</span><h3>{{ baselineSelected.length }} {{ uiText("éléments valides /") }} {{ baselineItems.length }} {{ uiText("proposés") }}</h3><p>{{ uiText("Relations directes, dates propres aux fiches, limite à 80 éléments liés.") }}</p><p v-if="snapshot.baselineError" role="alert">{{ uiText(snapshot.baselineError) }}</p><p v-if="!baselineItems.length">{{ uiText("Aucun élément proposé. Les dates des personnes et des relations ne sont pas transformées en faits.") }}</p><p v-if="snapshot.baselineTruncated" class="lab-caution">{{ uiText("Résultat tronqué avant classement par pertinence.") }}</p><ul><li v-for="item in baselineItems.slice(0, 12)" :key="item.qid"><strong>{{ item.title }}</strong><span>{{ uiText(formatSearchResultDateBound(item.startDate) || 'Date absente') }}<template v-if="item.endDate"> → {{ formatSearchResultDateBound(item.endDate) }}</template></span></li></ul><p v-if="baselineItems.length>12" class="lab-meta">{{ uiText("12 premiers éléments sur") }} {{ baselineItems.length }}.</p><Button variant="tertiary" size="sm" @click="tab='list';strategy='baseline'">{{ uiText("Voir tous les résultats actuels") }}</Button></article>
            <article class="lab-comparison-new"><span class="lab-kicker">{{ uiText("Approche par famille") }}</span><h3>{{ retained.length }} {{ uiText("proposés ·") }} {{ review.length }} {{ uiText("à vérifier") }}</h3><p>{{ activeProfile.description }}</p><ul><li v-for="item in retained.slice(0, 12)" :key="item.id"><strong>{{ item.title }}</strong><span>{{ uiText(item.start?.label) }}<template v-if="item.end"> → {{ uiText(item.end.label) }}</template></span></li></ul><p v-if="retained.length>12" class="lab-meta">{{ uiText("12 premiers éléments sur") }} {{ retained.length }}.</p><Button variant="secondary" size="sm" @click="tab='list';strategy='profile'">{{ uiText("Examiner les propositions") }}</Button></article>
          </section>

          <section v-else-if="tab === 'timeline'" class="lab-timeline" :aria-label="uiText('Aperçu chronologique de votre sélection')">
            <div class="lab-section-heading"><div><h3>{{ uiText("Une première lecture du temps") }}</h3><p>{{ selected.length }} {{ uiText("faits sélectionnés · les dates approximatives sont signalées par un tracé pointillé.") }}</p></div><Button variant="tertiary" size="sm" :disabled="!selected.length" @click="exportSelection">{{ uiText("Exporter la sélection") }}</Button></div>
            <p v-if="!selected.length" class="lab-empty">{{ uiText("Sélectionnez des faits dans « Faits et sources » pour composer l’aperçu.") }}</p>
            <div v-else class="lab-timeline-chart"><div class="lab-timeline-axis"><span>{{ uiText(selected[0]?.start?.label) }}</span><span>{{ uiText(timelineEnd?.end?.label || timelineEnd?.start?.label) }}</span></div><div v-for="item in selected" :key="item.id" class="lab-timeline-row"><button type="button" class="lab-timeline-label" @click="focusItem(item)">{{ item.title }}<small>{{ uiText(item.start?.label) }}<template v-if="item.end"> → {{ uiText(item.end.label) }}</template></small></button><div class="lab-timeline-track"><button type="button" class="lab-timeline-mark" :class="{'lab-timeline-mark--period':item.type==='period' && item.end,'lab-timeline-mark--approximate':item.start?.approximate || item.end?.approximate}" :style="itemStyle(item)" :aria-label="uiText(uiFormat`Voir la source : ${item.title}`)" :title="uiText(`${item.title} · ${item.start?.label}`)" @click="focusItem(item)" /></div></div></div>
            <p class="lab-meta lab-preview-note">{{ uiText("Placement indicatif des dates approximatives. Les intervalles ouverts restent à vérifier ; leurs fins ne sont pas prolongées jusqu’à aujourd’hui.") }}</p>
          </section>

          <section v-else class="lab-results" :aria-label="uiText('Faits proposés et sources')">
            <div class="lab-results-toolbar"><div class="lab-strategy"><button type="button" :aria-pressed="strategy==='profile'" @click="strategy='profile'">{{ uiText("Par famille") }}</button><button type="button" :aria-pressed="strategy==='baseline'" @click="strategy='baseline'">{{ uiText("Moteur actuel") }}</button></div><div v-if="strategy==='profile'" class="lab-selection-actions"><Button variant="ghost" size="xs" @click="selectAll(true)">{{ uiText("Tout sélectionner") }}</Button><Button variant="ghost" size="xs" @click="selectAll(false)">{{ uiText("Tout retirer") }}</Button></div></div>
            <template v-if="strategy === 'profile'">
              <div class="lab-filters" :aria-label="uiText('Filtrer les propositions')"><button v-for="entry in counts" :key="entry.value" type="button" :aria-pressed="filter === entry.value" @click="filter=entry.value">{{ uiText(entry.label) }} <span>{{ entry.count }}</span></button></div>
              <p class="lab-result-hint">{{ uiText("Ouvrez un fait pour connaître son origine et la raison de son classement.") }}</p>
              <p v-if="!visible.length" class="lab-empty">{{ uiText(filter==='review' ? 'Aucun fait à vérifier avec ces règles.' : filter==='excluded' ? 'Aucun fait écarté avec ces règles.' : 'Aucun fait dans cette vue. Essayez les autres filtres ou ajustez les règles.') }}</p>
              <article v-for="item in visible" :key="item.id" class="lab-item" :class="{'lab-item--excluded':item.status==='excluded'}">
                <label class="lab-item-check"><input type="checkbox" :checked="selectedIds.has(item.id)" :disabled="!selectable(item)" :aria-label="uiText(`Inclure ${item.title}`)" @change="toggle(item,$event)" /></label>
                <details :open="focusedItem===item.id" @toggle="focusedItem===item.id && !($event.target as HTMLDetailsElement).open ? focusedItem=null : undefined">
                  <summary><div class="lab-item-date"><strong>{{ uiText(item.start?.label || 'Date absente') }}</strong><span v-if="item.type==='period'">→ {{ uiText(item.end?.label || 'fin inconnue') }}</span></div><div class="lab-item-main"><span class="lab-item-category">{{ item.category }}<span v-if="item.start?.approximate || item.end?.approximate"> {{ uiText("· approximatif") }}</span></span><h3>{{ item.title }}</h3><p v-if="item.description">{{ item.description }}</p></div><Tag :variant="statusVariant(item.status)" :label="uiText(statusLabel[item.status])" /><Icon icon="mdi:chevron-down" class="lab-item-chevron" /></summary>
                  <div class="lab-item-evidence"><div><h4>{{ uiText("Pourquoi ce fait ?") }}</h4><ul><li v-for="reason in item.reasons" :key="reason">{{ reason }}</li></ul><p v-if="item.start?.issue">{{ item.start.issue }}</p><p v-if="item.end?.issue">{{ item.end.issue }}</p></div><div><h4>{{ uiText("Déclaration d’origine") }}</h4><a :href="sourceUrl(item)" target="_blank" rel="noopener noreferrer">{{ item.source.qid }} · {{ item.source.property }} {{ uiText(propertyLabels[item.source.property] || '') }} ↗</a><p>{{ uiText(item.origin==='fact' ? 'Fait construit depuis une déclaration du sujet.' : 'Dates lues sur la fiche de cet élément.') }}</p><p>{{ item.source.references }} {{ uiText("référence") }}{{ uiText(item.source.references===1 ? '' : 's') }} {{ uiText("sur cette déclaration.") }}</p><code v-if="item.start">{{ uiText(item.start.values.map(v=>uiFormat`${v.time} · précision ${v.precision}`).join(' / ')) }}</code><code v-if="item.end">{{ uiText("Fin :") }} {{ uiText(item.end.values.map(v=>uiFormat`${v.time} · précision ${v.precision}`).join(' / ')) }}</code></div></div>
                </details>
              </article>
            </template>
            <template v-else><p class="lab-result-hint">{{ uiText("Résultats du service actuel, avant toute réutilisation des éléments du catalogue.") }}</p><p v-if="snapshot.baselineError" role="alert">{{ uiText(snapshot.baselineError) }}</p><p v-if="!baselineItems.length" class="lab-empty">{{ uiText("Le moteur actuel ne propose aucun élément pour ce sujet.") }}</p><div v-for="item in baselineItems" :key="item.qid" class="lab-baseline-row"><div><strong>{{ item.title }}</strong><small>{{ uiText(item.type==='period' ? 'Période' : 'Événement') }} · {{ item.qid }}</small></div><span>{{ uiText(formatSearchResultDateBound(item.startDate) || 'Date absente') }}<template v-if="item.type==='period'"> → {{ uiText(formatSearchResultDateBound(item.endDate) || 'fin inconnue') }}</template></span><Tag :label="uiText(item.selected ? 'Valide' : 'À compléter')" :variant="item.selected ? 'neutral' : 'warning'" /></div></template>
          </section>
          <footer class="lab-footer"><span>{{ uiText("Un résultat daté n’est pas forcément un fait pertinent. Les propositions restent à relire.") }}</span><Button variant="secondary" size="sm" :disabled="!selected.length" @click="exportSelection">{{ uiText("Exporter") }} {{ selected.length }} {{ uiText("faits en JSON") }}</Button></footer>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.generation-lab { display:flex; flex-direction:column; min-height:0; height:100%; background:var(--color-background-default); }
.lab-heading { flex-shrink:0; display:flex; align-items:center; justify-content:space-between; gap:var(--spacing-xl); padding:var(--spacing-xl) var(--spacing-2xl); border-bottom:1px solid var(--color-border-default); background:var(--color-surface-default); }
.lab-heading h1 { font-family:var(--font-family-heading); font-size:28px; margin:var(--spacing-sm) 0; font-weight:var(--font-weight-medium); }
.lab-heading p,.lab-subject p { margin:0; color:var(--color-text-secondary); }
.lab-eyebrow { display:flex; align-items:center; gap:var(--spacing-sm); font:var(--type-micro); letter-spacing:.12em; color:var(--color-text-secondary); }
.lab-eyebrow :deep(.ui-tag) { letter-spacing:normal; }
.lab-dot { display:inline-block; width:6px; height:6px; flex-shrink:0; border-radius:50%; background:var(--color-text-link); }
.lab-workspace { display:grid; grid-template-columns:244px minmax(0,1fr); flex:1; min-height:0; }
.lab-sidebar { overflow:auto; min-height:0; border-right:1px solid var(--color-border-default); background:var(--color-surface-default); }
.lab-sidebar-section { padding:var(--spacing-xl) var(--spacing-lg); border-bottom:1px solid var(--color-border-light); }
.lab-sidebar h2 { font:var(--type-label); margin-bottom:var(--spacing-md); }
.lab-examples { display:flex; flex-direction:column; gap:var(--spacing-xs); }
.lab-example { display:flex; align-items:center; gap:var(--spacing-sm); width:100%; text-align:left; padding:var(--spacing-sm); border:1px solid transparent; border-radius:var(--radius-md); }
.lab-example:hover { background:var(--color-interaction-hover); }
.lab-example--active { color:var(--color-text-on-selected); background:var(--color-interaction-selected); border-color:var(--color-border-focus); }
.lab-example-icon { width:28px; height:28px; display:grid; place-items:center; border:1px solid var(--color-border-light); border-radius:var(--radius-md); flex-shrink:0; }
.lab-example-icon svg { width:17px; height:17px; }
.lab-example strong { font:var(--type-label); color:inherit; }
.lab-example small { display:block; font:var(--type-micro); color:var(--color-text-secondary); }
.lab-example--active small { color:inherit; }
.lab-example-arrow { margin-left:auto; }
.lab-custom form { display:flex; flex-wrap:wrap; gap:var(--spacing-sm); }
.lab-custom form :deep(.base-input) { flex:1 1 100%; }
.lab-search-results { list-style:none; padding:0; margin:var(--spacing-md) 0 0; }
.lab-search-results button { text-align:left; width:100%; padding:var(--spacing-sm); border-bottom:1px solid var(--color-border-light); }
.lab-search-results button:hover { background:var(--color-interaction-hover); }
.lab-search-results small { display:block; color:var(--color-text-secondary); font:var(--type-meta); }
.lab-search-error { font:var(--type-meta); color:var(--color-status-error-foreground); }
.lab-rules { display:flex; flex-direction:column; gap:var(--spacing-md); }
.lab-rules h2 { margin:0; }
.lab-rules label { display:flex; align-items:flex-start; gap:var(--spacing-sm); font:var(--type-meta); }
.lab-rules input,.lab-item-check input { accent-color:var(--color-primary); margin-top:2px; width:15px; height:15px; flex-shrink:0; }
.lab-sidebar-footer { display:block; padding:var(--spacing-lg); font:var(--type-meta); color:var(--color-text-secondary); }
.lab-sidebar-footer svg { vertical-align:middle; margin-right:var(--spacing-xs); }
.lab-content { overflow:auto; min-width:0; padding:var(--spacing-2xl); }
.lab-subject { display:flex; gap:var(--spacing-lg); justify-content:space-between; align-items:flex-start; }
.lab-subject > div { min-width:0; }
.lab-subject h2 { font-family:var(--font-family-heading); font-size:28px; font-weight:var(--font-weight-medium); margin:var(--spacing-sm) 0; }
.lab-subject p { max-width:650px; margin-bottom:var(--spacing-sm); }
.lab-kicker { font:var(--type-micro); font-weight:var(--font-weight-semibold); color:var(--color-text-link); letter-spacing:.08em; text-transform:uppercase; }
.lab-source-link { font:var(--type-meta); }
.lab-data-note { display:flex; align-items:center; flex-wrap:wrap; gap:var(--spacing-sm); font:var(--type-meta); color:var(--color-text-secondary); padding:var(--spacing-lg) 0; }
.lab-data-note > span:last-child { margin-left:auto; }
.lab-notice { display:flex; align-items:flex-start; gap:var(--spacing-sm); padding:var(--spacing-md); margin-bottom:var(--spacing-lg); border:1px solid var(--color-border-default); border-radius:var(--radius-md); background:var(--color-status-warning-background); color:var(--color-status-warning-foreground); }
.lab-notice svg { flex-shrink:0; width:18px; height:18px; }
.lab-notice p { margin:0; font:var(--type-meta); color:inherit; }
.lab-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); border:1px solid var(--color-border-default); border-radius:var(--radius-lg); overflow:hidden; margin:var(--spacing-sm) 0 var(--spacing-xl); background:var(--color-surface-default); }
.lab-metrics > div { display:flex; flex-direction:column; padding:var(--spacing-lg); gap:var(--spacing-xs); border-right:1px solid var(--color-border-default); }
.lab-metrics > div:last-child { border-right:0; }
.lab-metrics span,.lab-metrics small { font:var(--type-meta); color:var(--color-text-secondary); }
.lab-metrics strong { font-size:30px; font-weight:var(--font-weight-medium); line-height:1.25; font-variant-numeric:tabular-nums; }
.lab-metrics .lab-metric-primary { background:var(--color-interaction-selected); color:var(--color-text-on-selected); }
.lab-metric-primary span,.lab-metric-primary small { color:inherit; }
.lab-view-tabs { display:flex; flex-wrap:wrap; gap:var(--spacing-xl); border-bottom:1px solid var(--color-border-default); margin-bottom:var(--spacing-xl); }
.lab-view-tabs button { display:flex; align-items:center; gap:var(--spacing-sm); padding:var(--spacing-sm) 0 var(--spacing-md); border-bottom:2px solid transparent; color:var(--color-text-secondary); font:var(--type-label); }
.lab-view-tabs button[aria-pressed=true] { color:var(--color-text-link); border-bottom-color:var(--color-border-focus); }
.lab-results,.lab-timeline,.lab-comparison article { background:var(--color-surface-default); border:1px solid var(--color-border-default); border-radius:var(--radius-lg); }
.lab-results-toolbar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--spacing-sm); padding:var(--spacing-md) var(--spacing-lg); }
.lab-strategy { display:flex; border:1px solid var(--color-border-default); border-radius:var(--radius-md); padding:3px; gap:var(--spacing-xs); }
.lab-strategy button { font:var(--type-meta); padding:6px var(--spacing-md); border-radius:var(--radius-sm); color:var(--color-text-secondary); }
.lab-strategy button[aria-pressed=true] { background:var(--color-interaction-selected); color:var(--color-text-on-selected); }
.lab-selection-actions { display:flex; }
.lab-filters { display:flex; flex-wrap:wrap; gap:var(--spacing-sm); padding:var(--spacing-xs) var(--spacing-lg) var(--spacing-md); border-bottom:1px solid var(--color-border-light); }
.lab-filters button { display:flex; gap:var(--spacing-sm); align-items:center; padding:var(--spacing-xs) var(--spacing-sm); border-radius:var(--radius-md); font:var(--type-meta); color:var(--color-text-secondary); }
.lab-filters button[aria-pressed=true] { background:var(--color-interaction-selected); color:var(--color-text-on-selected); }
.lab-filters span { font-variant-numeric:tabular-nums; font-size:var(--font-size-xs); }
.lab-result-hint { font:var(--type-meta); color:var(--color-text-secondary); margin:0; padding:var(--spacing-md) var(--spacing-lg); }
.lab-item { display:flex; gap:var(--spacing-md); padding:var(--spacing-lg); border-top:1px solid var(--color-border-light); }
.lab-item-check { padding-top:var(--spacing-sm); }
.lab-item details { flex:1; min-width:0; }
.lab-item summary { display:flex; gap:var(--spacing-lg); align-items:flex-start; cursor:pointer; list-style:none; border-radius:var(--radius-sm); }
.lab-item summary::-webkit-details-marker { display:none; }
.lab-item summary:focus-visible { outline:2px solid var(--color-border-focus); outline-offset:4px; }
.lab-item-date { display:flex; flex:0 0 112px; flex-direction:column; font:var(--type-meta); padding-top:var(--spacing-xs); }
.lab-item-date strong { font-weight:var(--font-weight-medium); }
.lab-item-date span { color:var(--color-text-secondary); }
.lab-item-main { min-width:0; flex:1; }
.lab-item-category { font:var(--type-micro); color:var(--color-text-secondary); }
.lab-item-main h3 { margin:2px 0 0; font:var(--type-label); line-height:var(--line-height-body); }
.lab-item-main p { margin:2px 0 0; font:var(--type-meta); color:var(--color-text-secondary); }
.lab-item-chevron { flex-shrink:0; color:var(--color-text-secondary); width:18px; height:18px; margin-top:4px; }
.lab-item details[open] .lab-item-chevron { transform:rotate(180deg); }
.lab-item summary :deep(.ui-tag) { margin-top:3px; }
.lab-item-evidence { margin-top:var(--spacing-lg); display:grid; grid-template-columns:1fr 1fr; gap:var(--spacing-xl); background:var(--color-surface-subtle); padding:var(--spacing-lg); border:1px solid var(--color-border-light); border-radius:var(--radius-md); font:var(--type-meta); }
.lab-item-evidence h4 { font:var(--type-label); margin:0 0 var(--spacing-sm); }
.lab-item-evidence p,.lab-item-evidence ul { margin:var(--spacing-xs) 0; color:var(--color-text-secondary); }
.lab-item-evidence ul { padding-left:var(--spacing-lg); }
.lab-item-evidence code { display:block; font-family:var(--font-family-mono); font-size:var(--font-size-xs); overflow-wrap:anywhere; color:var(--color-text-secondary); }
.lab-empty { padding:var(--spacing-2xl); color:var(--color-text-secondary); margin:0; }
.lab-baseline-row { display:flex; align-items:center; gap:var(--spacing-lg); padding:var(--spacing-lg); border-top:1px solid var(--color-border-light); }
.lab-baseline-row > div { flex:1; min-width:0; }
.lab-baseline-row small { display:block; color:var(--color-text-secondary); }
.lab-comparison { display:grid; grid-template-columns:1fr 1fr; gap:var(--spacing-lg); }
.lab-comparison article { padding:var(--spacing-xl); min-width:0; }
.lab-comparison h3 { font:var(--type-panel-title); margin:var(--spacing-sm) 0; }
.lab-comparison p { color:var(--color-text-secondary); font:var(--type-meta); }
.lab-comparison ul { list-style:none; padding:0; margin:var(--spacing-xl) 0; }
.lab-comparison li { padding:var(--spacing-md) 0; border-bottom:1px solid var(--color-border-light); font:var(--type-meta); }
.lab-comparison li strong,.lab-comparison li span { display:block; }
.lab-comparison li span { color:var(--color-text-secondary); }
.lab-comparison .lab-comparison-new { border-top:3px solid var(--color-border-focus); }
.lab-caution { color:var(--color-status-warning-foreground) !important; }
.lab-section-heading { display:flex; justify-content:space-between; align-items:flex-start; gap:var(--spacing-lg); padding:var(--spacing-xl); }
.lab-section-heading h3 { font:var(--type-panel-title); margin:0 0 var(--spacing-xs); }
.lab-section-heading p { font:var(--type-meta); color:var(--color-text-secondary); margin:0; }
.lab-timeline-chart { padding:0 var(--spacing-2xl) var(--spacing-xl) var(--spacing-xl); }
.lab-timeline-axis { display:flex; justify-content:space-between; margin-left:196px; margin-bottom:var(--spacing-lg); color:var(--color-text-secondary); font:var(--type-micro); }
.lab-timeline-row { display:grid; grid-template-columns:180px minmax(0,1fr); gap:var(--spacing-lg); min-height:50px; align-items:center; }
.lab-timeline-label { text-align:left; min-width:0; font:var(--type-meta); padding:var(--spacing-xs) 0; overflow-wrap:anywhere; }
.lab-timeline-label small { display:block; font:var(--type-micro); color:var(--color-text-secondary); }
.lab-timeline-track { position:relative; height:100%; min-height:50px; background:linear-gradient(to right,var(--color-border-light) 1px,transparent 1px) left / 25% 100%; }
.lab-timeline-mark { position:absolute; top:calc(50% - 5px); width:10px; height:10px; border-radius:50%; background:var(--color-data-event); transform:translateX(-50%); }
.lab-timeline-mark--period { transform:none; height:14px; top:calc(50% - 7px); border-radius:3px; background:var(--color-data-period); }
.lab-timeline-mark--approximate { border:2px dashed var(--color-border-focus); background:var(--color-interaction-selected); }
.lab-preview-note { padding:0 var(--spacing-xl) var(--spacing-xl); }
.lab-meta { font:var(--type-meta); color:var(--color-text-secondary); margin:0; }
.lab-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--spacing-md); padding:var(--spacing-xl) 0 var(--spacing-sm); }
.lab-footer > span { font:var(--type-meta); color:var(--color-text-secondary); max-width:480px; }
@media(min-width:1450px) { .lab-content { padding-inline:max(var(--spacing-2xl),calc((100% - 1150px) / 2)); } }
@media(max-width:1100px) { .lab-workspace { grid-template-columns:220px minmax(0,1fr); } .lab-content { padding:var(--spacing-xl); } .lab-subject { flex-wrap:wrap; } .lab-data-note > span:last-child { margin-left:0; } .lab-item summary { gap:var(--spacing-sm); } .lab-item-date { flex-basis:95px; } .lab-item-evidence { grid-template-columns:1fr; } .lab-metrics > div { padding:var(--spacing-md); } }
@media(max-width:760px) { .lab-heading { padding:var(--spacing-lg); align-items:flex-start; flex-wrap:wrap; gap:var(--spacing-md); } .lab-heading h1 { font-size:24px; } .lab-workspace { display:block; overflow:auto; } .lab-sidebar { overflow:visible; border-right:0; } .lab-sidebar-section { padding:var(--spacing-lg); } .lab-sidebar-section:first-child { padding-bottom:var(--spacing-sm); } .lab-examples { flex-direction:row; overflow:auto; padding-bottom:var(--spacing-sm); } .lab-example { width:auto; flex:0 0 auto; } .lab-example small,.lab-example-arrow { display:none; } .lab-custom { padding-block:var(--spacing-sm); } .lab-custom form { flex-wrap:nowrap; align-items:flex-end; } .lab-custom form :deep(.base-input) { flex:1; } .lab-rules { display:grid; grid-template-columns:1fr 1fr; } .lab-rules h2,.lab-rules > p { grid-column:1/-1; } .lab-sidebar-footer { display:none; } .lab-content { overflow:visible; padding:var(--spacing-lg); } .lab-subject h2 { font-size:26px; } .lab-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } .lab-metrics > div { border-bottom:1px solid var(--color-border-light); } .lab-view-tabs { gap:var(--spacing-lg); } .lab-view-tabs button { font-size:11px; } .lab-item { padding:var(--spacing-md); gap:var(--spacing-sm); } .lab-item summary { flex-wrap:wrap; } .lab-item-date { flex:0 0 100%; flex-direction:row; gap:var(--spacing-sm); } .lab-item-main { flex-basis:50%; } .lab-item summary :deep(.ui-tag) { font-size:10px; padding-inline:var(--spacing-xs); } .lab-item-chevron { width:14px; } .lab-comparison { grid-template-columns:1fr; } .lab-timeline-row { grid-template-columns:120px minmax(0,1fr); } .lab-timeline-axis { margin-left:136px; } .lab-section-heading { flex-wrap:wrap; } .lab-baseline-row { flex-wrap:wrap; } }
</style>
