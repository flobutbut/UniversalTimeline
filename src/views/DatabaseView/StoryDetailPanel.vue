<template>
  <div class="story-detail-panel" :aria-busy="loading || panelBusy || undefined">

    <FeedbackState v-if="loading" kind="loading" />
    <FeedbackState v-else-if="error && !story" kind="error" :message="error" retryable @retry="$emit('retry')" />
    <FeedbackState v-else-if="!story" message="Sélectionnez une frise pour voir ses détails" />
    <template v-else>
      <div v-if="panelBusy" class="sr-only" role="status">Opération en cours…</div>
      <div v-if="error" class="story-finder-feedback" role="alert">
        {{ error }} <Button variant="tertiary" size="sm" type="button" :disabled="panelBusy" @click="$emit('retry')">Réessayer</Button>
      </div>
      <!-- En-tête méta -->
      <div class="story-detail-panel__meta">
        <div class="story-detail-panel__meta-text">
          <h2 class="story-detail-panel__title">{{ story.title.fr }}</h2>
          <p v-if="story.description?.fr" class="story-detail-panel__desc">{{ story.description.fr }}</p>
          <p v-if="story.createdAt || story.author" class="story-detail-panel__byline">
            <template v-if="story.createdAt">Créée le <time :datetime="story.createdAt.toISOString()">{{ formatRecordDate(story.createdAt) }}</time></template>
            <template v-if="story.createdAt && story.author"> · </template>
            <template v-if="story.author">par {{ story.author }}</template>
          </p>
          <StoryArchitecturePanel :story="story" :stories="dataStore.stories" :editable="auth.canEditStory(story)" :can-promote="auth.ownsStory(story)" :busy="panelBusy"
            @promote="emit('create-story-from-period', $event)" />
        </div>
        <div class="story-detail-panel__meta-actions">
          <Button variant="tertiary" size="sm" :disabled="panelBusy" @click="openEventCreator">Ajouter un événement</Button>
          <Button variant="primary" size="sm" :to="{ path: '/timeline', query: { story: story.id, entry: 'universe' } }">Voir dans la timeline</Button>
        </div>
      </div>

      <FeedbackState v-if="auth.canEditStory(story) && !story.parentStories?.length" layout="inline">
        Cette frise n’a aucun point d’entrée depuis une autre frise.
        <template #actions><Button variant="tertiary" size="sm" @click="selectContentTab('overview')">Gérer les points d’entrée</Button></template>
      </FeedbackState>

      <!-- Onglets -->
      <div class="story-detail-panel__tabs-bar">
        <Tabs
          :model-value="activeTab"
          @update:model-value="selectContentTab"
          class="story-detail-panel__tabs"
          :tabs="storyContentTabs"
          variant="underline" density="comfortable"
        />
      </div>

      <div ref="contentScroll" class="story-detail-panel__scroll-area">
      <!-- Timeline -->
      <StoryTimeline
        :key="story.id"
        collapsible
        :periods="previewPeriods"
        :events="story.events"
        :selected-period-id="previewSelectedPeriodId"
        :selected-event-id="selectedEventId"
        @select-period="onTimelineSelectPeriod"
        @select-event="onTimelineSelectEvent"
        @deselect="clearPeriodSelection(); selectedEventId = null; readonlyStory = null"
      />

      <!-- Contenu du tab actif -->
      <div
        ref="tabContent"
        class="story-detail-panel__tab-content"
        :style="{ minHeight: contentMinHeight === undefined ? undefined : `${contentMinHeight}px` }"
        :class="{
          'story-detail-panel__tab-content--finder-periods':
            activeTab === 'periods' && ((story.periods?.length ?? 0) > 0 || showExternalInFinder),
          'story-detail-panel__tab-content--finder-events':
            activeTab === 'events' && (story.events?.length ?? 0) > 0,
          'story-detail-panel__tab-content--tree-periods': activeTab === 'periods' && periodLayout === 'tree',
        }"
      >

        <!-- Périodes -->
        <template v-if="activeTab === 'periods'">
          <div class="story-detail-panel__tab-panel">
            <FilterBar layout="panel"
              hide-title
              hide-add
              v-model:search="periodHeaderSearch"
              v-model:category-id="periodFilterCategoryId"
              :category-options="storyPeriodCategoryFilterOptions"
              :suggestions="periodSearchSuggestions"
              :search-loading="periodSearchLoading"
              :search-error="periodSearchError"
              @retry-search="retryPeriodSearch"
              :allow-wikidata-create="false"
              @add="openPeriodCreator(0)"
              @pick-period="handleStoryPeriodSearchPick"
            >
              <template #actions>
                <Switch
                  variant="sm"
                  label-first
                  :model-value="showExternalInFinder"
                  label="Périodes additionnelles"
                  @update:model-value="onShowExternalChange"
                />
                <span class="story-finder-activity">
                  <span class="sr-only" role="status">{{ finderLoading ? 'Recherche des sous-périodes…' : '' }}</span>
                  <button v-if="finderLoading" type="button" class="story-finder-activity__cancel" aria-label="Annuler la recherche des sous-périodes" @click="cancelFinder">
                    <LoadingSpinner />
                    <span class="sr-only">Annuler</span>
                  </button>
                </span>
                <div class="story-period-layout-toggle" role="group" aria-label="Affichage des périodes">
                  <Button variant="ghost" size="sm" :pressed="periodLayout === 'columns'" @click="switchPeriodLayout('columns')">Colonnes</Button>
                  <Button variant="ghost" size="sm" :pressed="periodLayout === 'tree'" title="Nouvelle présentation à valider" @click="switchPeriodLayout('tree')">Arbre et détail</Button>
                </div>
              </template>
            </FilterBar>
          <div v-if="finderError" class="story-finder-feedback" role="alert">
            {{ finderError }}
            <Button variant="tertiary" size="sm" type="button" @click="retryFinder">Réessayer</Button>
            <Button variant="tertiary" size="sm" type="button" @click="cancelFinder">Annuler</Button>
          </div>
          <div v-if="periodImportError && !periodImportDraft" class="story-finder-feedback" role="alert">
            {{ periodImportError }} <Button variant="tertiary" size="sm" type="button" :disabled="periodImportBusy" @click="retryPeriodImport">Réessayer</Button>
          </div>
          <FeedbackState v-if="!story.periods?.length && !story.childStories?.length && !showExternalInFinder && !finderLoading && !finderError" title="Ajoutez votre première période" message="Définissez un début et une fin pour structurer votre frise. Vous pouvez créer une période manuellement ou en choisir une existante.">
            <template v-if="auth.canEditStory(story)" #actions><Button size="sm" :disabled="panelBusy" @click="openPeriodCreator(0)">Ajouter une période</Button></template>
          </FeedbackState>
          <div v-if="treeViewVisited && (story.periods?.length || story.childStories?.length || showExternalInFinder)" v-show="periodLayout === 'tree'" class="story-period-tree-workspace">
            <div class="story-period-tree-workspace__navigation">
              <StoryPeriodTree :story-id="story.id" :periods="story.periods" :additional-periods="finderPeriods" :selected-id="selectedPeriodId"
                :search="periodHeaderSearch" :category-id="periodFilterCategoryId" :show-additional="showExternalInFinder" :loaded-branch-ids="loadedBranchIds"
                @select="onTreePeriodSelect" @expanded-change="onTreeExpandedChange">
                <template #header-actions>
                  <Button variant="tertiary" size="sm" :disabled="panelBusy" @click="openPeriodCreator(0)">Ajouter une période</Button>
                </template>
                <template #actions="{ period, inStory }">
                  <StoryItemActionsMenu v-if="inStory" :label="period.label.fr || period.label.en" :disabled="panelBusy" movable :create-story="auth.ownsStory(story)" :promote="promotableIds.has(period.id)" :convert-to="periodConvertTo(period.id)"
                    @move="movingPeriodId = period.id" @edit="emit('edit-period', period.id)" @remove="emit('remove-period', period.id)" @create-story="emit('create-story-from-period', period.id)" @convert="convertPeriod(period.id)" />
                  <Button v-else variant="ghost" size="sm" icon-only :disabled="panelBusy || requiresParentImport(period)" :aria-label="`Ajouter ${period.label.fr || period.label.en} à la frise`" @click.stop="onTreePeriodAction(period.id)"><template #icon><Icon icon="mdi:plus" aria-hidden="true" /></template></Button>
                </template>
              </StoryPeriodTree>
            </div>
            <div class="story-period-tree-workspace__detail">
              <StoryPeriodDetail :period="selectedTreePeriod" :in-story="!!selectedTreeNode?.inStory"
                :can-create-story="auth.ownsStory(story)" :promote="!!selectedTreePeriod && promotableIds.has(selectedTreePeriod.id)"
                :children="selectedTreeChildren" :stories="selectedTreeStories" :summaries="dataStore.stories" :busy="!!panelBusy"
                :can-add="!!selectedTreePeriod && !requiresParentImport(selectedTreePeriod)"
                @select="onTreePeriodSelect" @edit="emit('edit-period', $event)" @move="movingPeriodId = $event" @remove="emit('remove-period', $event)"
                @create-story="emit('create-story-from-period', $event)" @convert="convertPeriod" @add="onTreePeriodAction" @add-child="createTreeChildPeriod" @associate-story="associateTreeStory"
                @remove-story="(id, periodId) => emit('remove-child-story', id, { type: 'period', id: periodId })" />
            </div>
          </div>
          <div v-show="periodLayout === 'columns'" class="story-period-columns">
          <template v-if="story.periods?.length || story.childStories?.length || showExternalInFinder">
            <div class="story-detail-panel__finder-columns-wrap">
              <div class="finder-columns">
                <div
                  v-for="(col, colIdx) in visibleFinderColumns"
                  :key="colIdx"
                  class="finder-column story-period-column"
                  :data-column-index="colIdx"
                  :class="{ 'story-period-column--drop-target': periodDragTarget === colIdx }"
                  @dragstart.capture="startPeriodDrag"
                  @dragend="endPeriodDrag"
                  @dragover="overPeriodColumn($event, colIdx)"
                  @dragleave="leavePeriodColumn($event, colIdx)"
                  @drop="dropPeriodInColumn($event, colIdx)"
                  @keydown.esc="endPeriodDrag"
                >
                  <div class="finder-column-header story-column-header">
                    <div class="story-column-header__title">
                      <h2>{{ finderColumnHeader(colIdx) }}</h2>
                    </div>
                    <div class="story-column-header__actions">
                      <Button variant="tertiary" size="xs" :disabled="panelBusy || (colIdx > 0 && !storyPeriodIds.includes(finderSelectedPath[colIdx - 1] ?? ''))" :title="colIdx > 0 && !storyPeriodIds.includes(finderSelectedPath[colIdx - 1] ?? '') ? 'Ajoutez d’abord cette période à la frise.' : undefined" @click="openChildStoryPicker(colIdx)">Ajouter une frise</Button>
                      <Button variant="tertiary" size="xs" :disabled="panelBusy || (colIdx > 0 && finderSelectedPath[colIdx - 1]?.startsWith('wikidata:'))" :title="colIdx > 0 && finderSelectedPath[colIdx - 1]?.startsWith('wikidata:') ? 'Importez d’abord la période parente.' : undefined" @click="openPeriodCreator(colIdx)">Ajouter une période</Button>
                    </div>
                  </div>
                  <div class="finder-column-content">
                    <template v-if="col.length > 0 || childStoriesForColumn(colIdx).length > 0">
                      <FinderItem
                        v-for="row in col"
                        :key="row.item.id"
                        :label="storyPeriodLabelForFinder(row.item)"
                        :start-date="storyPeriodDateFields(row.item).startDate"
                        :end-date="storyPeriodDateFields(row.item).endDate"
                        :categories="storyPeriodCategories(row.item)"
                        :selected="selectedPeriodId === row.item.id"
                        :has-children="finderRowHasChildren(row.item, row.inStory)"
                        :item-id="row.item.id"
                        :draggable="row.inStory && canDragPeriod(row.item.id)"
                        :data-story-period-id="row.item.id"
                        :class="{ 'story-period-row--dragging': draggedPeriodId === row.item.id }"
                        :is-external-catalog="!row.inStory"
                        :wikidata-only="row.item.id.startsWith('wikidata:')"
                        hide-row-action
                        @click="onFinderPeriodSelect(row.item, colIdx)"
                      >
                        <template #actions>
                          <StoryItemActionsMenu v-if="row.inStory" :label="storyPeriodLabelForFinder(row.item).fr" :disabled="panelBusy" :create-story="auth.ownsStory(story)" :promote="promotableIds.has(row.item.id)" movable :convert-to="periodConvertTo(row.item.id)"
                            @move="movingPeriodId = row.item.id" @edit="emit('edit-period', row.item.id)" @remove="emit('remove-period', row.item.id)"
                            @create-story="emit('create-story-from-period', row.item.id)" @convert="convertPeriod(row.item.id)" />
                          <button
                            v-else
                            type="button"
                            class="finder-item-add"
                            :aria-label="row.item.id.startsWith('wikidata:') ? 'Importer depuis Wikidata' : 'Ajouter à la frise'"
                            :title="requiresParentImport(row.item) ? 'Ajoutez d’abord la période parente à la frise.' : undefined"
                            :disabled="panelBusy || requiresParentImport(row.item)"
                            @click.stop="onPeriodAction(row)"
                          >
                            <Icon icon="mdi:plus" width="14" height="14" aria-hidden="true" />
                          </button>
                        </template>
                      </FinderItem>
                      <AnchoredStoryRow v-for="cs in childStoriesForColumn(colIdx)" :key="cs.id" :story="cs" :summary="childStorySummary(cs.id)" :disabled="panelBusy"
                        column-actions explorable :read-only="!auth.canEditStory(story)" :display-as-period="storyLinkAsPeriod(cs, colIdx)"
                        :explored="readonlyStory?.id === cs.id && readonlyStory.column === colIdx"
                        :data-child-story-id="cs.id" :draggable="canDragChildStory(cs.id, colIdx)"
                        :class="{ 'story-period-row--dragging': draggedChildStory?.id === cs.id && draggedChildStory.column === colIdx }"
                        @explore="readonlyStory = { id: cs.id, column: colIdx }"
                        @move="movingStoryLink = { id: cs.id, fromParentId: finderSelectedPath[colIdx - 1] ?? null, label: cs.title.fr || cs.title.en }"
                        @display="emit('display-child-story', cs.id, columnAnchor(colIdx), !storyLinkAsPeriod(cs, colIdx))"
                        @remove="emit('remove-child-story', cs.id, colIdx ? columnAnchor(colIdx) : cs.atRoot || !cs.anchors.length ? null : undefined)" />

                    </template>
                    <div v-else class="finder-empty-column">
                      <template v-if="colIdx === 0">Aucune racine</template>
                      <template v-else>Aucune sous-période</template>
                    </div>
                  </div>
                </div>
                <StoryReadOnlyColumns v-if="readonlyStory" :key="`${readonlyStory.id}:${readonlyStory.column}`" :story-id="readonlyStory.id" />
              </div>
            </div>
          </template>
          </div>
          </div>
        </template>

        <!-- Événements -->
        <template v-else-if="activeTab === 'events'">
          <div class="story-detail-panel__tab-panel">
            <FilterBar layout="panel"
              mode="events"
              hide-title
              hide-add
              v-model:search="eventHeaderSearch"
              v-model:category-id="eventFilterCategoryId"
              :category-options="storyEventCategoryFilterOptions"
              :event-suggestions="eventSearchSuggestions"
              :search-loading="eventSearchLoading"
              :search-error="eventSearchError"
              @retry-search="retryEventSearch"
              @add="openEventCreator"
              @pick-event="handleStoryEventSearchPick"
            />
          <template v-if="story.events?.length">
            <div class="events-finder-layout">
              <!-- Colonne gauche : liste des événements -->
              <div class="events-finder-list">
                <FinderItem
                  v-for="event in eventsFilteredForList"
                  :key="event.id"
                  :label="event.label"
                  :selected="selectedEventId === event.id"
                  :has-children="false"
                  :item-id="event.id"
                  :start-date="event.date"
                  :date-subtitle-override="formatStoryEventDateLabel(event)"
                  :draggable="false"
                  hide-row-action
                  hide-chevron
                  @click="onStoryEventFinderRowClick(event.id)"
                >
                </FinderItem>
              </div>

              <!-- Colonne droite : détail de l'événement sélectionné -->
              <div class="events-finder-detail">
                <template v-if="selectedEventId">
                  <template v-for="event in story.events.filter(e => e.id === selectedEventId)" :key="event.id">
                    <div class="event-detail-layout" :class="{ 'event-detail-layout--with-metadata': hasEventMetadata(event) }">
                      <div class="event-detail-overview">
                        <header class="event-detail-header">
                          <div class="event-detail-heading">
                            <h3 class="event-detail-label">{{ event.label.fr?.trim() || event.label.en?.trim() }}</h3>
                            <div class="event-detail-date">{{ eventDetailDate(event) }}</div>
                          </div>
                          <div class="event-detail-actions">
                            <Button variant="tertiary" size="sm" :disabled="panelBusy" @click="emit('edit-event', event.id)">Modifier l’événement</Button>
                            <Button variant="tertiary" size="sm" :disabled="panelBusy" @click="convertEvent(event)">Convertir en période</Button>
                          </div>
                          <p v-if="eventDescription(event)" class="event-detail-description" aria-label="Description de l’événement">{{ eventDescription(event) }}</p>
                          <p v-else class="event-detail-empty event-detail-description">Aucune description renseignée.</p>
                        </header>
                        <section class="event-detail-section" aria-label="Catégories de l’événement">
                          <h4 class="event-detail-section-title">Catégories</h4>
                          <ul v-if="event.categories.length" class="event-detail-categories">
                            <li v-for="category in event.categories" :key="category.id"><Tag :label="category.label.fr?.trim() || category.label.en?.trim() || category.id" /></li>
                          </ul>
                          <p v-else class="event-detail-empty">Aucune catégorie renseignée.</p>
                        </section>

                        <div class="event-detail-frise">
                          <div class="event-detail-section event-detail-importance">
                            <h4 :id="`event-importance-${event.id}`" class="event-detail-section-title">Importance dans cette frise</h4>
                            <p class="event-detail-section-description">Les événements majeurs sont affichés en priorité sur la timeline.</p>
                            <Tabs :model-value="event.importance ?? 'normal'" :tabs="eventImportanceTabs" role="group" :aria-labelledby="`event-importance-${event.id}`"
                              @update:model-value="value => changeEventImportance(event, value)" />
                          </div>

                          <section class="event-detail-section event-detail-associations" aria-label="Frises associées à cet événement">
                            <div class="event-detail-section-header">
                              <div class="event-detail-section-copy">
                                <div class="event-detail-section-heading">
                                  <h4 class="event-detail-section-title">Frises associées</h4>
                                  <span class="event-detail-count">{{ storiesAssociatedWithEvent(event.id).length }}</span>
                                </div>
                                <p class="event-detail-section-description">Des frises à explorer depuis cet événement dans la timeline.</p>
                              </div>
                              <Button variant="tertiary" size="sm" :disabled="panelBusy" @click="openChildStoryPicker(undefined, event.id)">Associer une frise</Button>
                            </div>
                            <AnchoredStoryRow v-for="cs in storiesAssociatedWithEvent(event.id)" :key="cs.id" :story="cs" :summary="childStorySummary(cs.id)" :disabled="panelBusy"
                              :read-only="!hasExplicitEventAnchor(cs.id, event.id)" @remove="emit('remove-event-anchor', cs.id, event.id)" />

                            <div
                              v-if="storiesAssociatedWithEvent(event.id).length === 0"
                              class="event-detail-empty"
                            > Aucune frise associée à cet événement. </div>

                          </section>
                          <section class="event-detail-section" aria-label="Zone de danger">
                            <h4 class="event-detail-section-title">Zone de danger</h4>
                            <p class="event-detail-section-description">Cet événement sera retiré de cette frise. Il restera disponible dans le catalogue.</p>
                            <Button variant="danger" size="sm" :disabled="panelBusy" @click="emit('remove-event', event.id)">Supprimer de cette frise</Button>
                          </section>
                        </div>
                      </div>
                      <aside v-if="hasEventMetadata(event)" class="event-detail-metadata" aria-label="Métadonnées de l’événement">
                        <section v-if="eventWikidataId(event)" class="event-detail-section event-detail-reference" aria-label="Référence Wikidata">
                          <h4 class="event-detail-section-title">Référence Wikidata</h4>
                          <a :href="`https://www.wikidata.org/wiki/${eventWikidataId(event)}`" target="_blank" rel="noopener noreferrer" :aria-label="`Voir ${eventWikidataId(event)} sur Wikidata (nouvel onglet)`">
                            <span>{{ eventWikidataId(event) }}</span><Icon icon="mdi:open-in-new" aria-hidden="true" />
                          </a>
                        </section>

                        <dl v-if="eventRecordDate(event.createdAt) || eventRecordDate(event.updatedAt)" class="event-detail-record">
                          <div v-if="eventRecordDate(event.createdAt)"><dt>Créé le</dt><dd>{{ eventRecordDate(event.createdAt) }}</dd></div>
                          <div v-if="eventRecordDate(event.updatedAt)"><dt>Mis à jour le</dt><dd>{{ eventRecordDate(event.updatedAt) }}</dd></div>
                        </dl>
                      </aside>
                    </div>
                  </template>
                </template>
                <div v-else class="event-detail-placeholder">
                  Sélectionnez un événement
                </div>
              </div>
            </div>
          </template>
          <FeedbackState v-else title="Ajoutez votre premier événement" message="Placez les moments clés de votre frise à une date précise. Vous pouvez créer un événement manuellement ou en choisir un existant.">
            <template v-if="auth.canEditStory(story)" #actions><Button size="sm" :disabled="panelBusy" @click="openEventCreator">Ajouter un événement</Button></template>
          </FeedbackState>
          </div>
        </template>

        <!-- Propriétés : paramètres, points d’entrée, catégories et parcours de la frise -->
        <div v-else class="story-settings-panel story-overview">
          <StorySettingsForm :story="story" :editable="auth.canEditStory(story)" :busy="panelBusy" :error="settingsError" @save="emit('save-story', $event)" />
          <div class="story-overview__section">
            <StoryRelationsPanel :story="story" :busy="panelBusy" :error="error"
              @add-parent="(sourceId, periodId) => emit('add-parent-entry', sourceId, periodId)"
              @remove-parent="(sourceId, anchor) => emit('remove-parent-entry', sourceId, anchor)"
              @set-parent="(parentId, periodId) => emit('set-parent', parentId, periodId)" />
          </div>
          <div class="story-overview__section">
            <StoryCategoriesForm :story="story" :editable="auth.canEditStory(story)" :busy="panelBusy" :error="settingsError" @save="emit('save-story', $event)" />
          </div>
          <StoryNavigationPanel :story="story" :busy="panelBusy" @saved="emit('retry')" />
          <!-- Les actions destructrices restent en fin de page, après tout le contenu modifiable. -->
          <StoryDangerZone v-if="auth.ownsStory(story)" :story="story" :busy="panelBusy"
            @delete="emit('delete-story')" @toggle-visibility="emit('toggle-visibility')" />
        </div>

      </div>
      </div>
    </template>

    <EditModal v-if="periodImportDraft" :is-open="true" type="period" mode="create" :data="periodImportDraft"
      :loading="periodImportBusy" :error="periodImportError" allow-existing-periods :search-bounds="storySearchBounds" :excluded-period-ids="periodCreationExcludedIds"
      @close="closePeriodImport" @submit="submitPeriodImport" @select-period="selectExistingStoryPeriod" />
    <MoveStoryPeriodModal v-if="movingPeriodId && story" :period-id="movingPeriodId" :periods="story.periods" :busy="panelBusy" :error="error"
      @close="movingPeriodId = null" @confirm="movePeriod" />
    <MoveStoryLinkModal v-if="movingStoryLink && story" :key="`${movingStoryLink.id}:${movingStoryLink.fromParentId}`" :label="movingStoryLink.label"
      :from-parent-id="movingStoryLink.fromParentId" :periods="story.periods" :busy="!!panelBusy" :error="error" @close="movingStoryLink = null" @confirm="moveStoryLink" />
    <!-- Modales de sélection -->
    <RootPeriodModal v-if="showRootPicker" :current-root-id="firstStoryRootPeriodId" :current-root-label="story?.periods.find(p => p.id === firstStoryRootPeriodId)?.label.fr" :busy="panelBusy" :error="error" @close="showRootPicker = false" @confirm="onChangeRoot" />
    <EditModal v-if="eventCreationDraft" :is-open="true" type="event" mode="create" :data="eventCreationDraft"
      :loading="eventCreationBusy" :error="eventCreationError" allow-existing-events :search-bounds="storySearchBounds" :excluded-event-ids="storyEventIds"
      @close="closeEventCreator" @submit="submitEventCreation" @select-event="selectExistingStoryEvent" />
    <EditModal v-if="conversionDraft && conversionSource" :is-open="true" :type="conversionSource.kind === 'period' ? 'event' : 'period'" mode="create"
      :convert-from="conversionSource.kind" :data="conversionDraft" :loading="conversionBusy" :error="conversionError"
      @close="closeConversion" @submit="submitConversion" />
    <StoryRelatedPickerModal
      v-if="showChildStoryPicker && story"
      :exclude-story-ids="childStoryPickerExcludeIds"
      :periods="childStoryAnchor ? undefined : story.periods"
      @close="showChildStoryPicker = false"
      @confirm="onAddChildStories"
    />
  </div>
</template>

<script setup lang="ts">
import FeedbackState from '@/components/base/FeedbackState.vue';
import LoadingSpinner from '@/components/base/LoadingSpinner.vue';
import { resolveYearsBeforePresent } from '@temporal';
import { ref, computed, watch, nextTick } from 'vue';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import Tag from '@/components/base/Tag.vue';
import { DateService } from '@/services/DateService';
import { listEventYearsBP } from '@/lib/listEventTableHelpers';
import RootPeriodModal from './RootPeriodModal.vue';
import MoveStoryPeriodModal from './MoveStoryPeriodModal.vue';
import MoveStoryLinkModal from './MoveStoryLinkModal.vue';
import StoryReadOnlyColumns from './StoryReadOnlyColumns.vue';
import StorySettingsForm from './StorySettingsForm.vue';
import StoryDangerZone from './StoryDangerZone.vue';
import StoryCategoriesForm from './StoryCategoriesForm.vue';
import StoryRelationsPanel from './StoryRelationsPanel.vue';
import StoryNavigationPanel from './StoryNavigationPanel.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import StoryItemActionsMenu from './StoryItemActionsMenu.vue';
import StoryArchitecturePanel from './StoryArchitecturePanel.vue';
import { promotionCandidates } from '@/lib/storyArchitecture';
import EditModal from './EditModal.vue';
import { useStoryWikidataPeriodImport } from '@/composables/useStoryWikidataPeriodImport';
import AnchoredStoryRow from './AnchoredStoryRow.vue';
import { storyNavigationLinks } from '@/lib/storyNavigationLinks';
import Tabs from '@/components/base/Tabs.vue';
import type { Tab } from '@/types/global';
import { EVENT_IMPORTANCES, EVENT_IMPORTANCE_LABELS } from '@/lib/eventImportance';
import Switch from '@/components/base/Switch.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import StoryPeriodTree from './StoryPeriodTree.vue';
import StoryPeriodDetail from './StoryPeriodDetail.vue';
import { buildStoryPeriodTree, findStoryPeriodTreePath } from '@/lib/storyPeriodTree';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import FilterBar from "@/components/FilterBar.vue";
import { useDataStore } from '@/stores/useDataStore';
import { useStoryEventCreation } from '@/composables/useStoryEventCreation';
import { useCatalogueConversion } from '@/composables/useCatalogueConversion';
import StoryRelatedPickerModal from './StoryRelatedPickerModal.vue';
import { formatStoryEventDateLabel } from '@/lib/formatTemporalBoundLabel';
import { formatRecordDate } from '@/lib/storyListDates';
import { useToast } from '@/composables/useToast';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import { useStoryPeriodFinder } from '@/composables/useStoryPeriodFinder';
import { useStoryPeriodColumnDrag } from '@/composables/useStoryPeriodColumnDrag';
import { linkedStoryPreviewPeriods } from '@/lib/linkedStoryPeriods';
import { localSearchHitToPeriod, localSearchHitToEvent } from '@/lib/searchHitEntities';
import { SearchApiService } from '@/services/SearchApiService';
import {
  compareStoryPeriodsByStartOldestFirst,
  getGlobalChildrenNotInStory,
  getStoryPeriodRoots,
  buildStoryFinderPathFromSelectedPeriodId,
  getStoryPeriodChildren,
  listPeriodToStoryPeriodInput,
  storyPeriodLabelForFinder,
  storyPeriodDateFields,
  storyPeriodCategories,
  storyPeriodHasChildrenInStory,
} from '@/lib/storyPeriodFinderColumns';
import type { EventImportance, Story, StoryAnchor, ChildStorySummary, ListEvent, ListPeriod } from '@/types/database';
import type { StoryPeriodInput } from '@/types/periodTree';
import type { EditFormSubmission } from '@/types/editForm';

const toast = useToast();
const auth = useAuthStore();

const props = defineProps<{
  story?: Story | null;
  loading?: boolean;
  updating?: boolean;
  error?: string | null;
  /** Erreur du dernier enregistrement des paramètres ou des catégories. */
  settingsError?: string | null;
}>();

const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'period-imported'): void;
  /** Une période est devenue un événement (ou l'inverse) dans tout le catalogue. */
  (e: 'entity-converted'): void;
  (e: 'remove-period', id: string): void;
  (e: 'edit-period', id: string): void;
  (e: 'create-story-from-period', id: string): void;
  (e: 'edit-event', id: string): void;
  (e: 'remove-event', id: string): void;
  (e: 'add-periods', ids: string[], parentPeriodId?: string | null): void;
  (e: 'event-added'): void;
  (e: 'add-child-stories', ids: string[], anchor?: StoryAnchor | null): void;
  (e: 'move-child-story', id: string, from: StoryAnchor | null, to: StoryAnchor | null): void;
  (e: 'display-child-story', id: string, location: StoryAnchor | null, asPeriod: boolean): void;
  (e: 'change-root', id: string): void;
  (e: 'save-story', submission: EditFormSubmission): void;
  (e: 'delete-story'): void;
  (e: 'toggle-visibility'): void;
  (e: 'set-parent', parentId: string, periodId: string | null): void;
  (e: 'remove-child-story', id: string, anchor?: StoryAnchor | null): void;
  (e: 'add-parent-entry', sourceId: string, periodId: string | null): void;
  (e: 'remove-parent-entry', sourceId: string, anchor?: StoryAnchor | null): void;
  (e: 'add-event-anchor', childStoryId: string, eventId: string): void;
  (e: 'remove-event-anchor', childStoryId: string, eventId: string): void;
  (e: 'change-event-importance', eventId: string, importance: EventImportance): void;
}>();

/** Même composant que le menu principal (Tabs en pastilles) ; bloqué pendant une écriture. */
const eventImportanceTabs = computed<Tab<EventImportance>[]>(() => EVENT_IMPORTANCES
  .map(value => ({ value, label: EVENT_IMPORTANCE_LABELS[value], disabled: panelBusy.value })));
function changeEventImportance(event: ListEvent, importance: EventImportance) {
  if (importance !== (event.importance ?? 'normal')) emit('change-event-importance', event.id, importance);
}

function eventDescription(event: ListEvent): string {
  return event.description?.fr?.trim() || event.description?.en?.trim() || '';
}
function eventWikidataId(event: ListEvent): string | null {
  const id = event.wikidata_id?.trim() ?? '';
  return /^Q[1-9]\d*$/.test(id) ? id : null;
}
function eventDetailDate(event: ListEvent): string {
  const date = DateService.parse(event.date);
  if (date.kind !== 'unknown') return DateService.format(date);
  const years = listEventYearsBP(event);
  return years === null ? 'Date non déterminée' : DateService.formatGeological(years);
}
function eventRecordDate(value: Date | undefined): string {
  return value && Number.isFinite(value.getTime()) ? formatRecordDate(value) : '';
}
function hasEventMetadata(event: ListEvent): boolean {
  return !!(eventWikidataId(event) || eventRecordDate(event.createdAt) || eventRecordDate(event.updatedAt));
}

const {
  draft: periodImportDraft, busy: periodImportBusy, error: periodImportError,
  open: importWikidataPeriod, openCreate: createStoryPeriod, selectExisting: selectExistingStoryPeriod, close: closePeriodImport, submit: submitPeriodImport, retry: retryPeriodImport,
} = useStoryWikidataPeriodImport(() => props.story, () => emit('period-imported'));
const {
  draft: eventCreationDraft, busy: eventCreationBusy, error: eventCreationError,
  open: openEventCreator, close: closeEventCreator, submit: submitEventCreation, selectExisting: selectExistingStoryEvent,
} = useStoryEventCreation(() => props.story, () => emit('event-added'));
const {
  draft: conversionDraft, source: conversionSource, busy: conversionBusy, error: conversionError,
  fromPeriod: openPeriodConversion, fromEvent: convertEvent, close: closeConversion, submit: submitConversion,
} = useCatalogueConversion(() => props.story?.id, () => { selectedEventId.value = null; clearPeriodSelection(); emit('entity-converted'); });
/** Une période qui organise des sous-périodes dans la frise ne peut pas devenir un événement. */
function periodConvertTo(id: string) {
  return storyPeriodHasChildrenInStory((props.story?.periods ?? []) as StoryPeriodInput[], id) ? undefined : 'event' as const;
}
function convertPeriod(id: string) {
  const period = props.story?.periods.find(item => item.id === id);
  if (period && periodConvertTo(id)) openPeriodConversion(period);
}
const movingPeriodId = ref<string | null>(null);
const movingStoryLink = ref<{ id: string; fromParentId: string | null; label: string } | null>(null);
const readonlyStory = ref<{ id: string; column: number } | null>(null);
function columnAnchor(index: number): StoryAnchor | null {
  const id = finderSelectedPath.value[index - 1];
  return id ? { type: 'period', id } : null;
}
function storyLinkAsPeriod(story: ChildStorySummary, index: number) {
  const anchor = columnAnchor(index);
  return anchor ? !!story.anchors.find(item => item.type === anchor.type && item.id === anchor.id)?.displayAsPeriod : !!story.rootDisplayAsPeriod;
}
function moveStoryLink(parentId: string | null) {
  const link = movingStoryLink.value;
  if (link && !panelBusy.value) emit('move-child-story',link.id,link.fromParentId ? { type: 'period',id: link.fromParentId } : null,parentId ? { type: 'period',id: parentId } : null);
}
function movePeriod(parentId: string | null) {
  if (movingPeriodId.value && !panelBusy.value) emit('add-periods', [movingPeriodId.value], parentId);
}
// Keep the dialog on a refused write; close only once its placement is confirmed.
watch(() => props.story?.periods.map(p => `${p.id}:${getStoryPeriodParentId(p)}`).join(','), () => { movingPeriodId.value = null; });
const panelBusy = computed(() => props.updating || periodImportBusy.value || eventCreationBusy.value || conversionBusy.value);
const showRootPicker = ref(false);
const periodCreationParentId = ref<string | null>(null);
const childStoryAnchor = ref<StoryAnchor>();
function openPeriodCreator(colIdx: number) { periodCreationParentId.value = finderSelectedPath.value[colIdx - 1] ?? null; createStoryPeriod(periodCreationParentId.value); }
function onChangeRoot(id: string) { requestedRootId.value = id; emit('change-root', id); }
const requestedRootId = ref<string | null>(null);
function childStorySummary(id: string) { return dataStore.stories.find(s => s.id === id); }
const {
  additionalPeriods: wikidataPeriods, selectedId: selectedPeriodId, path: finderSelectedPath, showExternal: showExternalInFinder,
  loading: finderLoading, error: finderError, retry: retryFinder, cancel: cancelFinder,
  clear: clearPeriodSelection, pick: pickPeriod, selectRow: selectPeriodRow, toggleExternal: toggleAdditionalPeriods,
  loadBranches, loadedBranchIds, selectTreeRow,
} = useStoryPeriodFinder(() => props.story);
const selectedEventId = ref<string | null>(null);
// La frise reste visible au-dessus de chaque onglet ; Propriétés porte ses paramètres, catégories et relations.
type ContentTab = 'overview' | 'periods' | 'events';
const activeTab = ref<ContentTab>('periods');
const contentScroll = ref<HTMLElement | null>(null);
const tabContent = ref<HTMLElement | null>(null);
const contentMinHeight = ref<number>();
let tabScrollRevision = 0;
async function selectContentTab(tab: ContentTab) {
  const revision = ++tabScrollRevision;
  const storyId = props.story?.id;
  // Même un onglet court doit pouvoir amener sa barre de filtres en haut de la page.
  if (contentScroll.value) contentMinHeight.value = contentScroll.value.clientHeight;
  activeTab.value = tab;
  await nextTick();
  if (revision !== tabScrollRevision || storyId !== props.story?.id) return;
  const viewport = contentScroll.value;
  const content = tabContent.value;
  if (!viewport || !content) return;
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  if (tab === 'overview') {
    if (viewport.scrollTop > 1) viewport.scrollTo?.({ top: 0, behavior });
    return;
  }
  const top = Math.max(0, viewport.scrollTop + content.getBoundingClientRect().top - viewport.getBoundingClientRect().top - viewport.clientTop);
  // Ne pas remonter la page ni relancer une animation une fois l'aperçu masqué.
  if (top - viewport.scrollTop <= 1) return;
  viewport.scrollTo?.({ top, behavior });
}
// La vue existante reste celle par défaut tant que la nouvelle présentation n'est pas validée.
const periodLayout = ref<'columns' | 'tree'>('columns');
const {
  draggedId: draggedPeriodId, draggedStory: draggedChildStory, targetColumn: periodDragTarget, canDrag: canDragPeriod, canDragStory: canDragChildStory,
  start: startPeriodDrag, over: overPeriodColumn, leave: leavePeriodColumn, drop: dropPeriodInColumn, end: endPeriodDrag,
} = useStoryPeriodColumnDrag({
  story: () => props.story,
  path: () => finderSelectedPath.value,
  enabled: () => activeTab.value === 'periods' && periodLayout.value === 'columns' && !!props.story && auth.canEditStory(props.story),
  busy: () => !!panelBusy.value,
  move: (id, parentId) => emit('add-periods', [id], parentId),
  moveStory: (id, from, to) => emit('move-child-story', id, from ? { type: 'period', id: from } : null, to ? { type: 'period', id: to } : null),
});
const treeViewVisited = ref(false);
const treeExpandedIds = ref<string[]>([]);

const periodHeaderSearch = ref('');
const periodFilterCategoryId = ref('');

const eventHeaderSearch = ref('');
const eventFilterCategoryId = ref('');

const dataStore = useDataStore();
const previewLinks = computed(() => linkedStoryPreviewPeriods(props.story,dataStore.stories));
const previewPeriods = computed(() => [...(props.story?.periods ?? []),...previewLinks.value]);
const previewSelectedPeriodId = computed(() => {
  const link = readonlyStory.value;
  if (!link) return selectedPeriodId.value;
  return previewLinks.value.find(period => period.linkedStoryId === link.id && period.storyParentId === (finderSelectedPath.value[link.column - 1] ?? null))?.id ?? selectedPeriodId.value;
});
/** Règle 3 : périodes à proposer en sous-frise. */
const promotableIds = computed(() => new Set(props.story ? promotionCandidates(props.story).map(candidate => candidate.periodId) : []));
const finderPeriods = computed(() => wikidataPeriods.value);
const periodTreeNodes = computed(() => buildStoryPeriodTree(props.story?.periods ?? [], showExternalInFinder.value ? finderPeriods.value : []));
const selectedTreePath = computed(() => selectedPeriodId.value ? findStoryPeriodTreePath(periodTreeNodes.value, selectedPeriodId.value) : []);
const selectedTreeNode = computed(() => selectedTreePath.value[selectedTreePath.value.length - 1]);
const selectedTreePeriod = computed(() => selectedTreeNode.value?.period ?? null);
const selectedTreeChildren = computed(() => (props.story?.periods ?? []).filter(period => getStoryPeriodParentId(period) === selectedPeriodId.value).sort(compareStoryPeriodsByStartOldestFirst));
const selectedTreeStories = computed(() => (props.story?.childStories ?? []).filter(story => story.anchors.some(anchor => anchor.type === 'period' && anchor.id === selectedPeriodId.value)));
function switchPeriodLayout(layout: 'columns' | 'tree') {
  if (layout === periodLayout.value) return;
  if (layout === 'tree') treeViewVisited.value = true;
  cancelFinder(); periodLayout.value = layout;
  if (layout === 'tree' && showExternalInFinder.value) void loadBranches(treeExpandedIds.value);
}
function onTreeExpandedChange(ids: string[]) {
  treeExpandedIds.value = ids;
  if (periodLayout.value === 'tree' && showExternalInFinder.value) void loadBranches(ids);
}
function onTreePeriodSelect(id: string) {
  selectedEventId.value = null;
  selectTreeRow(id);
}
async function onShowExternalChange(enabled: boolean) {
  await toggleAdditionalPeriods(enabled);
  if (enabled && showExternalInFinder.value && !finderError.value && periodLayout.value === 'tree') await loadBranches(treeExpandedIds.value);
}
function onTreePeriodAction(id: string) {
  const path = findStoryPeriodTreePath(periodTreeNodes.value, id);
  const node = path[path.length - 1];
  if (node && !node.inStory) onPeriodAction({ item: node.period, inStory: false });
}
function createTreeChildPeriod(id: string) {
  if (panelBusy.value || !props.story?.periods.some(period => period.id === id)) return;
  periodCreationParentId.value = id; createStoryPeriod(id);
}
function associateTreeStory(id: string) {
  if (panelBusy.value || !props.story?.periods.some(period => period.id === id)) return;
  childStoryAnchor.value = { type: 'period', id }; showChildStoryPicker.value = true;
}
function requiresParentImport(item: StoryPeriodInput) {
  return item.id.startsWith('wikidata:') && (!item.parentId || item.parentId.startsWith('wikidata:'));
}
function onPeriodAction(row: FinderColumnRow) {
  if (panelBusy.value) return;
  if (row.item.id.startsWith('wikidata:')) {
    const period = wikidataPeriods.value.find(p => p.id === row.item.id && p.parentId === row.item.parentId);
    if (period) { periodCreationParentId.value = period.parentId ?? null; void importWikidataPeriod(period); }
  } else emit('add-periods', [row.item.id], getStoryPeriodParentId(row.item));
}

const storyContentTabs = computed(() => [
  { label: 'Périodes', value: 'periods' as const },
  { label: 'Événements', value: 'events' as const },
  { label: 'Propriétés', value: 'overview' as const },
]);

const storySearchBounds = computed(() => {
  const values = (props.story?.periods ?? []).flatMap(period => [resolveYearsBeforePresent(period.startDate, period.startYearsBP), resolveYearsBeforePresent(period.endDate, period.endYearsBP)]).filter((value): value is number => value !== null);
  return values.length ? { start: Math.max(...values), end: Math.min(...values) } : null;
});

const storyPeriodIds = computed(() => (props.story?.periods ?? []).map((p) => p.id));

const periodCreationExcludedIds = computed(() => {
  const periods = props.story?.periods ?? [];
  const parentId = periodCreationParentId.value;
  const existing = parentId ? getStoryPeriodChildren(periods, parentId) : getStoryPeriodRoots(periods);
  return [...new Set([...existing.map(period => period.id), ...buildStoryFinderPathFromSelectedPeriodId(periods, parentId)])];
});

const firstStoryRootPeriodId = computed<string | null>(() => {
  const periods = (props.story?.periods ?? []) as StoryPeriodInput[];
  const ids = new Set(periods.map((p) => p.id));
  const root = periods.find((p) => {
    const pid = getStoryPeriodParentId(p);
    return !pid || !ids.has(String(pid));
  });
  return root?.id ?? null;
});
watch(firstStoryRootPeriodId, id => { if (id && id === requestedRootId.value) { showRootPicker.value = false; clearPeriodSelection(); requestedRootId.value = null; } });
const storyEventIds = computed(() => (props.story?.events ?? []).map((e) => e.id));

type FinderColumnRow = { item: StoryPeriodInput; inStory: boolean };

const finderDisplayColumns = computed<FinderColumnRow[][]>(() => {
  const story = (props.story?.periods ?? []) as StoryPeriodInput[];
  const path = finderSelectedPath.value;
  const storyIdSet = new Set(story.map((p) => p.id));
  const all = finderPeriods.value;
  const n = path.length + 1;
  const cols: FinderColumnRow[][] = [];

  for (let c = 0; c < n; c++) {
    let storySlice =
      c === 0 ? getStoryPeriodRoots(story) : getStoryPeriodChildren(story, path[c - 1]!);
    // An associated descendant reached through an additional period stays in that column.
    if (showExternalInFinder.value && c === 0) {
      storySlice = storySlice.filter(period => !path.includes(period.id) || path[0] === period.id);
    }
    let rows: FinderColumnRow[] = storySlice.map((item) => ({ item, inStory: true }));

    if (showExternalInFinder.value && c > 0) {
      const extraList = getGlobalChildrenNotInStory(all, path[c - 1]!, storyIdSet);
      const seen = new Set(rows.map((r) => r.item.id));
      for (const lp of extraList) {
        const item = listPeriodToStoryPeriodInput(lp);
        if (!seen.has(item.id) && !path.slice(0, c).includes(item.id)) {
          rows.push({ item, inStory: false });
          seen.add(item.id);
        }
      }
      rows = rows.slice().sort((a, b) => compareStoryPeriodsByStartOldestFirst(a.item, b.item));
    }
    cols.push(rows);
  }
  return cols;
});

const storyPeriodCategoryFilterOptions = computed(() => {
  const map = new Map<string, { id: string; label: { fr: string; en: string } }>();
  for (const p of props.story?.periods ?? []) {
    for (const cat of p.categories ?? []) {
      if (!map.has(cat.id)) map.set(cat.id, cat as { id: string; label: { fr: string; en: string } });
    }
  }
  const rest = [...map.values()]
    .sort((a, b) => a.label.fr.localeCompare(b.label.fr, 'fr', { sensitivity: 'base' }))
    .map((c) => ({ value: c.id, label: c.label.fr }));
  return [{ value: '', label: 'Toutes les catégories' }, ...rest];
});

const storyEventCategoryFilterOptions = computed(() => {
  const map = new Map<string, { id: string; label: { fr: string; en: string } }>();
  for (const ev of props.story?.events ?? []) {
    for (const cat of ev.categories ?? []) {
      if (!map.has(cat.id)) map.set(cat.id, cat as { id: string; label: { fr: string; en: string } });
    }
  }
  const rest = [...map.values()]
    .sort((a, b) => a.label.fr.localeCompare(b.label.fr, 'fr', { sensitivity: 'base' }))
    .map((c) => ({ value: c.id, label: c.label.fr }));
  return [{ value: '', label: 'Toutes les catégories' }, ...rest];
});

function periodRowMatchesCategory(row: FinderColumnRow, categoryId: string): boolean {
  if (!categoryId) return true;
  const cats = storyPeriodCategories(row.item);
  return cats?.some((c) => c.id === categoryId) ?? false;
}

const finderDisplayColumnsFiltered = computed(() => {
  const catId = periodFilterCategoryId.value;
  const cols = finderDisplayColumns.value;
  if (!catId) return cols;
  return cols.map((col) => col.filter((row) => periodRowMatchesCategory(row, catId)));
});
const visibleFinderColumns = computed(() => readonlyStory.value ? finderDisplayColumnsFiltered.value.slice(0,readonlyStory.value.column + 1) : finderDisplayColumnsFiltered.value);
watch(() => finderSelectedPath.value.join(','), () => { readonlyStory.value = null; }, { flush: 'sync' });
watch(() => JSON.stringify(props.story?.childStories), () => {
  movingStoryLink.value = null;
  const current = readonlyStory.value;
  if (current && !childStoriesForColumn(current.column).some(child => child.id === current.id)) readonlyStory.value = null;
});

const eventsFilteredForList = computed(() => {
  const catId = eventFilterCategoryId.value;
  const evs = props.story?.events ?? [];
  if (!catId) return evs;
  return evs.filter((e) => e.categories?.some((c) => c.id === catId) ?? false);
});

const { results: periodSearchSuggestions, loading: periodSearchLoading, error: periodSearchError, retry: retryPeriodSearch } = useDebouncedSearch(
  () => periodHeaderSearch.value,
  async (query, signal) => {
    const hits = await SearchApiService.getInstance().searchLocal(query, { onlyPeriods: true, categoryId: periodFilterCategoryId.value || undefined, signal });
    return hits.filter(hit => hit.type === 'period').map(localSearchHitToPeriod);
  },
  { minLength: 1, delayMs: 250, criteria: () => [props.story?.id, periodFilterCategoryId.value], enabled: () => !!props.story && !props.loading && !props.error && activeTab.value === 'periods' },
);
const { results: eventSearchSuggestions, loading: eventSearchLoading, error: eventSearchError, retry: retryEventSearch } = useDebouncedSearch(
  () => eventHeaderSearch.value,
  async (query, signal) => {
    const hits = await SearchApiService.getInstance().searchLocal(query, { onlyEvents: true, categoryId: eventFilterCategoryId.value || undefined, signal });
    return hits.filter(hit => hit.type === 'event').map(localSearchHitToEvent);
  },
  { minLength: 1, delayMs: 250, criteria: () => [props.story?.id, eventFilterCategoryId.value], enabled: () => !!props.story && !props.loading && !props.error && activeTab.value === 'events' },
);

watch([periodHeaderSearch, periodFilterCategoryId, activeTab, () => props.loading, () => props.error], cancelFinder, { flush: 'sync' });

watch(
  [activeTab, eventsFilteredForList],
  () => {
    const sid = selectedEventId.value;
    if (!eventsFilteredForList.value.some((e) => e.id === sid)) {
      selectedEventId.value = activeTab.value === 'events' ? eventsFilteredForList.value[0]?.id ?? null : null;
    }
  },
  { immediate: true },
);

async function handleStoryPeriodSearchPick(period: ListPeriod) {
  periodHeaderSearch.value = '';
  selectedEventId.value = null;
  activeTab.value = 'periods';
  await pickPeriod(period);
}

function handleStoryEventSearchPick(ev: ListEvent) {
  eventHeaderSearch.value = '';
  activeTab.value = 'events';
  clearPeriodSelection();

  const inStory = (props.story?.events ?? []).some((e) => e.id === ev.id);
  if (inStory) {
    selectedEventId.value = ev.id;
    return;
  }
  toast.show(
    "Cet événement n'est pas associé à cette frise. Utilisez « Ajouter un événement » pour l'ajouter.",
    'info',
  );
}

function finderColumnHeader(colIdx: number): string {
  if (colIdx === 0) return 'Périodes';
  const parentId = finderSelectedPath.value[colIdx - 1];
  const fromStory = (props.story?.periods ?? []).find((x) => x.id === parentId);
  if (fromStory) return storyPeriodLabelForFinder(fromStory).fr || 'Sous-périodes';
  const fromStore = finderPeriods.value.find((p) => p.id === parentId);
  return fromStore?.label?.fr || 'Sous-périodes';
}

function finderRowHasChildren(item: StoryPeriodInput, inStory: boolean): boolean {
  if (inStory && storyPeriodHasChildrenInStory((props.story?.periods ?? []) as StoryPeriodInput[], item.id)) return true;
  const p = finderPeriods.value.find(p => p.id === item.id) ?? props.story?.periods.find(period => period.id === item.id);
  if (p?.hasChildren) return true;
  return finderPeriods.value.some((x) => x.parentId === item.id);
}

watch(() => props.story?.id, () => {
  movingStoryLink.value = null; readonlyStory.value = null;
  movingPeriodId.value = null;
  periodHeaderSearch.value = ''; periodFilterCategoryId.value = '';
  eventHeaderSearch.value = ''; eventFilterCategoryId.value = '';
  selectedEventId.value = null;
  showRootPicker.value = false;
  showChildStoryPicker.value = false;
}, { flush: 'sync' });

function onFinderPeriodSelect(period: StoryPeriodInput, colIdx: number) {
  readonlyStory.value = null;
  selectedEventId.value = null;
  void selectPeriodRow(period.id, colIdx);
}

function onTimelineSelectPeriod(id: string) {
  const linked = previewLinks.value.find(period => period.id === id);
  if (linked) {
    activeTab.value = 'periods'; switchPeriodLayout('columns'); selectedEventId.value = null;
    if (linked.storyParentId) selectTreeRow(linked.storyParentId);
    else clearPeriodSelection();
    readonlyStory.value = { id: linked.linkedStoryId, column: finderSelectedPath.value.length };
    return;
  }
  readonlyStory.value = null;
  if (periodLayout.value === 'tree') {
    activeTab.value = 'periods'; onTreePeriodSelect(id); return;
  }
  if (selectedPeriodId.value === id) clearPeriodSelection();
  else {
    const period = props.story?.periods.find(p => p.id === id);
    if (period) { activeTab.value = 'periods'; void pickPeriod(period); }
  }
  selectedEventId.value = null;
}

function onTimelineSelectEvent(id: string) {
  readonlyStory.value = null;
  selectedEventId.value = selectedEventId.value === id ? null : id;
  clearPeriodSelection();
  activeTab.value = 'events';
}

function onStoryEventFinderRowClick(eventId: string) {
  selectedEventId.value = eventId;
  clearPeriodSelection();
}

const showChildStoryPicker = ref(false);


const childStoryPickerExcludeIds = computed(() => {
  const s = props.story;
  if (!s) return [];
  const anchor = childStoryAnchor.value;
  return [s.id, ...(anchor ? (s.childStories ?? []).filter(cs => cs.anchors.some(a => a.type === anchor.type && a.id === anchor.id)).map(cs => cs.id) : [])];
});

function openChildStoryPicker(colIdx?: number, eventId?: string) {
  const periodId = colIdx === undefined ? undefined : finderSelectedPath.value[colIdx - 1];
  childStoryAnchor.value = eventId ? { type: 'event', id: eventId } : periodId ? { type: 'period', id: periodId } : undefined;
  showChildStoryPicker.value = true;
}

function onAddChildStories(ids: string[], periodId?: string) {
  showChildStoryPicker.value = false;
  const anchor = childStoryAnchor.value ?? (periodId ? { type: 'period' as const, id: periodId } : undefined);
  if (ids.length && anchor) emit('add-child-stories', ids, anchor);
}

/**
 * Retourne les stories enfants à afficher dans la colonne `colIdx`.
 * Colonne 0 (racine) : stories sans ancre de type period.
 * Colonne N : stories qui ont une ancre period = finderSelectedPath[N-1].
 */
/** Match exploration: explicit anchors and readable frises sharing the event, deduplicated. */
const navigationStories = computed(() => props.story ? storyNavigationLinks(props.story) : []);
function storiesAssociatedWithEvent(eventId: string): ChildStorySummary[] {
  return navigationStories.value.filter(cs => cs.anchors.some(a => a.type === 'event' && a.id === eventId));
}
function hasExplicitEventAnchor(storyId: string, eventId: string): boolean {
  return !!props.story?.childStories?.some(cs => cs.id === storyId && cs.anchors.some(a => a.type === 'event' && a.id === eventId));
}

function childStoriesForColumn(colIdx: number): ChildStorySummary[] {
  const children = props.story?.childStories ?? [];
  if (colIdx === 0) {
    // An anchor on a period that is no longer in this frise places the child at the root, not nowhere.
    const periodIds = new Set((props.story?.periods ?? []).map(period => period.id));
    return children.filter(cs => cs.atRoot || !cs.anchors.some(a => a.type === 'period' && periodIds.has(a.id)));
  }
  const periodId = finderSelectedPath.value[colIdx - 1] ?? null;
  if (!periodId) return [];
  return children.filter(cs => cs.anchors.some(a => a.type === 'period' && a.id === periodId));
}

</script>

<style scoped>
.story-finder-feedback { padding: var(--spacing-sm) var(--spacing-md); color: var(--color-text-primary); }
.story-period-layout-toggle { display: flex; gap: 2px; padding: 2px; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); }
.story-detail-panel :deep(.filter-bar__slot-actions) { flex-wrap: wrap; max-width: 100%; }
.story-period-columns { display: flex; flex: 1; flex-direction: column; min-height: 0; }
.story-period-column--drop-target { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.story-period-column--drop-target .finder-column-header, .story-period-column--drop-target .finder-column-content { background: var(--color-interaction-hover); }
.story-period-columns :deep(.finder-item[draggable="true"] .finder-item-content) { cursor: grab; }
.story-period-columns :deep(.anchored-story-row[draggable="true"] .anchored-story-row__link) { cursor: grab; }
.story-period-row--dragging { opacity: .5; }
.story-period-row--dragging :deep(.finder-item-content), .story-period-row--dragging :deep(.anchored-story-row__link) { cursor: grabbing; }
.story-period-tree-workspace { display: grid; grid-template-columns: clamp(240px, 30%, 340px) minmax(0, 1fr); flex: none; background: var(--color-surface-default); }
.story-period-tree-workspace__navigation { display: flex; flex-direction: column; min-width: 0; min-height: 0; border-right: 1px solid var(--color-border-default); }
.story-period-tree-workspace__detail { container-type: inline-size; display: flex; flex-direction: column; min-width: 0; }
@media (max-width: 600px) {
  .story-period-tree-workspace { grid-template-columns: minmax(0, 1fr); }
  .story-period-tree-workspace__navigation { border-right: 0; border-bottom: 1px solid var(--color-border-default); }
}
.story-finder-feedback button { margin-left: var(--spacing-sm); }
.story-finder-activity { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: 0 0 20px; }
.story-finder-activity__cancel { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; padding: 2px; border: 0; border-radius: var(--radius-sm); background: transparent; cursor: pointer; }
.story-finder-activity__cancel:focus-visible { outline: 2px solid var(--color-border-focus); }



/* ─── Container ──────────────────────────────────────────────────────────────── */

.story-detail-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-background-default);
}



/* ─── Méta ───────────────────────────────────────────────────────────────────── */

.story-detail-panel__meta {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  flex-shrink: 0;
}

.story-detail-panel__meta-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.story-detail-panel__title {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.story-detail-panel__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  /* Une ligne lisible ; les actions restent à droite. */
  max-width: 72ch;
}

.story-detail-panel__byline {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

/* ─── Tab bar ─────────────────────────────────────────────────────────────────── */

.story-detail-panel__tabs-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-right: var(--spacing-md);
  border-bottom: 1px solid var(--color-border-default);
  flex-shrink: 0;
}

.story-detail-panel__tabs {
  flex: 1;
  min-width: 0;
}

.story-detail-panel__scroll-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.story-detail-panel__tab-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.story-detail-panel__tab-panel .story-detail-panel__finder-columns-wrap {
  flex: 1;
  min-height: 0;
}

.story-detail-panel__finder-columns-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.story-detail-panel__finder-columns-wrap .finder-columns {
  flex: 1;
  min-height: 0;
  /* Same fill as the columns: the space past the last column reads as part of them. */
  background: var(--color-surface-default);
}

/* ─── Contenu du tab ──────────────────────────────────────────────────────────── */

.story-detail-panel__tab-content {
  flex: 1 0 auto;
  min-height: 0;
}

.story-detail-panel__tab-content--finder-periods {
  flex: 1 0 clamp(320px, 60dvh, 560px);
  min-height: clamp(320px, 60dvh, 560px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Les listes et leurs fiches grandissent avec leur contenu : seule la page défile. */
.story-detail-panel__tab-content--tree-periods,
.story-detail-panel__tab-content--finder-events {
  flex: 1 0 auto;
  min-height: 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
}
.story-detail-panel__tab-content--tree-periods > .story-detail-panel__tab-panel,
.story-detail-panel__tab-content--finder-events > .story-detail-panel__tab-panel {
  flex: none;
  overflow: visible;
}

.finder-empty-column {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-style: italic;
}

/* ─── Layout deux colonnes onglet événements ──────────────────────────────── */

.events-finder-layout {
  display: grid;
  grid-template-columns: clamp(220px, 24%, 280px) minmax(0, 1fr);
  flex: none;
}

.events-finder-list {
  border-right: 1px solid var(--color-border-default);
  padding: 0;
  background: var(--color-surface-default);
}

.events-finder-detail {
  container-type: inline-size;
  min-width: 0;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
  background: var(--color-surface-default);
}

.event-detail-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-sm) var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-default);
}

.event-detail-heading { min-width: 0; flex: 1 1 200px; }
.event-detail-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-xs); }
.event-detail-label {
  margin: 0;
  font-size: var(--font-size-2xl);
  line-height: var(--line-height-loose);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

.event-detail-date {
  font: var(--type-body);
  color: var(--color-text-secondary);
  margin: 0;
}

.event-detail-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--spacing-2xl); }
.event-detail-overview, .event-detail-frise { display: flex; flex-direction: column; gap: var(--spacing-xl); min-width: 0; }
.event-detail-frise { padding-top: var(--spacing-xl); border-top: 1px solid var(--color-border-default); }
.event-detail-description { flex: 0 0 100%; margin: 0; color: var(--color-text-primary); font: var(--type-body); white-space: pre-wrap; overflow-wrap: anywhere; }
.event-detail-categories { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); list-style: none; padding: 0; margin: 0; }
.event-detail-categories li { min-width: 0; max-width: 100%; }
.event-detail-categories :deep(.ui-tag__label) { white-space: normal; overflow-wrap: anywhere; }
.event-detail-reference a { display: inline-flex; align-items: center; gap: var(--spacing-sm); align-self: flex-start; color: var(--color-text-link); font: var(--type-body); text-decoration: none; }
.event-detail-reference a:hover { text-decoration: underline; }
.event-detail-reference a:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 3px; }
.event-detail-record { display: flex; flex-direction: column; gap: var(--spacing-md) var(--spacing-xl); margin: 0; padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-default); color: var(--color-text-secondary); font: var(--type-meta); }
.event-detail-record dt { margin-bottom: var(--spacing-xs); }
.event-detail-record dd { margin: 0; }
.event-detail-section-heading { display: flex; align-items: center; gap: var(--spacing-sm); }
.event-detail-section-header { display: flex; align-items: center; gap: var(--spacing-md); }
.event-detail-section-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 0; }
.event-detail-section-header > .base-button { flex-shrink: 0; margin-left: auto; }
.event-detail-count { padding: 0 var(--spacing-xs); min-width: var(--line-height-control); border-radius: var(--radius-sm); background: var(--color-interaction-hover); text-align: center; font: var(--type-meta); color: var(--color-text-secondary); }
.event-detail-associations { padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-default); }

.event-detail-metadata { display: flex; flex-direction: column; align-self: start; gap: var(--spacing-xl); min-width: 0; padding-top: var(--spacing-xl); border-top: 1px solid var(--color-border-default); color: var(--color-text-secondary); font: var(--type-meta); }
.event-detail-metadata .event-detail-section-title { color: var(--color-text-secondary); font: var(--type-label); }
.event-detail-metadata .event-detail-reference a { font: var(--type-meta); }
.event-detail-metadata .event-detail-record { border: 0; padding: 0; }
.event-detail-associations :deep(.anchored-story-row:hover), .event-detail-associations :deep(.anchored-story-row:focus-within) { outline: 1px solid var(--color-border-focus); outline-offset: -1px; }
@container (min-width: 720px) {
  .event-detail-layout--with-metadata { grid-template-columns: minmax(0, 1fr) 200px; gap: var(--spacing-2xl); }
  .event-detail-metadata { padding: 0 0 0 var(--spacing-xl); border-top: 0; border-left: 1px solid var(--color-border-default); }
}

.event-detail-section {
  display: flex;
  flex-direction: column;
}

.event-detail-empty {
  margin: 0;
  font: var(--type-body);
  color: var(--color-text-secondary);
  font-style: normal;
}

.event-detail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
}




/* ─── Spinner ─────────────────────────────────────────────────────────────────── */



.story-detail-panel { min-width: 0; }
.story-detail-panel__meta { border-bottom: 0; min-height: 64px; background: var(--color-surface-default); align-items: flex-start; }
.story-detail-panel__meta-actions { display: flex; gap: var(--spacing-sm); align-items: center; flex-shrink: 0; }
.story-detail-panel__title { font-size: var(--font-size-lg); line-height: var(--line-height-heading); }
.story-detail-panel__desc { line-height: var(--line-height-small); }
.story-detail-panel__tabs-bar { background: var(--color-surface-default); }
.story-column-header { flex-direction: column; align-items: stretch; gap: var(--spacing-sm); height: 80px; flex-shrink: 0; }
.story-column-header__title { display: flex; align-items: center; gap: var(--spacing-sm); min-width: 0; min-height: 20px; }
.story-column-header__title h2 { flex: 1; }
.story-column-header__actions { display: flex; gap: var(--spacing-sm); }
.story-column-header__actions .base-button { flex: 1; min-width: 0; }
.event-detail-section-title { font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); text-transform: none; letter-spacing: 0; color: var(--color-text-primary); margin: 0; }
.event-detail-section-description { font-size: var(--font-size-sm); line-height: var(--line-height-control); color: var(--color-text-secondary); margin: 0; }
.event-detail-section { align-items: stretch; gap: var(--spacing-sm); }
.event-detail-section > .base-button { align-self: flex-start; margin-top: var(--spacing-xs); }
.event-detail-importance :deep(.tabs) { max-width: 100%; background: var(--color-background-default); }
.event-detail-importance :deep(.tab-button) { flex: 1; justify-content: center; min-height: var(--field-height-md); padding: var(--spacing-xs) var(--spacing-sm); }
.event-detail-importance :deep(.tab-button:hover:not(:disabled):not(.tab-button--active)) { background: var(--color-interaction-hover); }
.story-settings-panel { padding: var(--spacing-xl); background: var(--color-surface-default); min-height: 100%; }
.story-overview { display: flex; flex-direction: column; gap: var(--spacing-xl); }
.story-overview__section { max-width: 960px; padding-top: var(--spacing-xl); border-top: 1px solid var(--color-border-default); }
@media (max-width: 1000px) { .story-detail-panel__meta { flex-wrap: wrap; } .story-detail-panel__meta-actions { flex-wrap: wrap; } }
@media (max-width: 600px) {
  .story-detail-panel__meta-actions { width: 100%; }
  .events-finder-layout { grid-template-columns: minmax(0, 1fr); }
  .events-finder-list { border-right: 0; border-bottom: 1px solid var(--color-border-default); }
  .events-finder-detail { padding: var(--spacing-lg); }
}


</style>
