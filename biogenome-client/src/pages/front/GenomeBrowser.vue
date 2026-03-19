<template>
   <div class="gb-page">
      <header class="gb-page__header">
         <p class="gb-page__kicker">{{ t('genomeBrowser.title') }}</p>
         <h1 class="gb-page__title">{{ t('genomeBrowser.title') }}</h1>
         <p class="gb-page__description">{{ t('genomeBrowser.description') }}</p>
      </header>

      <div class="gb-grid">
         <aside class="gb-left" aria-label="Assembly list">
            <VaCard class="gb-card gb-left__card">
               <VaCardContent>
                  <h2 class="va-h6 gb-left__title" id="gb-assemblies-label">{{ t('models.assemblies') }}</h2>
                  <VaInput
                     v-model="searchTerm"
                     class="gb-left__search"
                     :placeholder="t('genomeBrowser.assemblies.placeholder')"
                     :loading="isLoadingAssemblies"
                     :aria-label="t('genomeBrowser.assemblies.placeholder')"
                     @input="handleFilter"
                  >
                     <template #append-inner>
                        <VaIcon name="fa-search" aria-hidden="true" />
                     </template>
                  </VaInput>
                  <p v-if="!isLoadingAssemblies && searchTerm" class="gb-left__hint">
                     {{ t('genomeBrowser.assemblies.searchHint') }}
                  </p>
               </VaCardContent>
               <VaCardContent class="gb-left__list-wrap">
                  <div v-if="isLoadingAssemblies && assemblies.length === 0" class="gb-left__loading-wrap">
                     <VaProgressCircle indeterminate size="medium" color="primary" />
                     <span class="gb-left__loading-text">{{ t('genomeBrowser.loadingAssemblies') }}</span>
                  </div>
                  <template v-else-if="assemblies.length === 0">
                     <div class="gb-left__empty">
                        <VaIcon name="fa-box-open" size="large" class="gb-left__empty-icon" />
                        <p class="gb-left__empty-text">{{ t('genomeBrowser.noAssemblies') }}</p>
                     </div>
                  </template>
                  <VaInfiniteScroll
                     v-else
                     :disabled="isLoadingAssemblies || allLoaded"
                     :load="fetchMoreAssemblies"
                     :offset="120"
                  >
                     <ul class="gb-left__list" role="list" aria-labelledby="gb-assemblies-label">
                        <li v-for="assembly in assemblies" :key="assembly.accession" class="gb-left__list-item">
                           <button
                              type="button"
                              class="gb-left__item"
                              :class="{ 'gb-left__item--active': selectedAssembly?.accession === assembly.accession }"
                              :aria-pressed="selectedAssembly?.accession === assembly.accession"
                              :aria-label="`${assembly.assembly_name}, ${assembly.scientific_name}`"
                              @click="selectAssembly(assembly)"
                           >
                              <span class="gb-left__item-title" :title="assembly.assembly_name">
                                 {{ assembly.assembly_name }}
                              </span>
                              <span class="gb-left__item-subtitle" :title="assembly.scientific_name">{{
                                 assembly.scientific_name
                              }}</span>
                              <span class="gb-left__item-meta">{{ assembly.accession }}</span>
                           </button>
                        </li>
                        <li v-if="isLoadingAssemblies" class="gb-left__loading">
                           <VaProgressCircle indeterminate size="small" color="primary" />
                        </li>
                     </ul>
                  </VaInfiniteScroll>
               </VaCardContent>
               <VaCardContent v-if="assemblies.length > 0" class="gb-left__footer">
                  <span class="gb-left__footer-text">
                     {{ t('items.data.results') }} <strong>{{ totalAssemblies }}</strong>
                  </span>
               </VaCardContent>
            </VaCard>
         </aside>

         <section class="gb-main">
            <div v-if="!selectedAssembly" class="gb-empty">
               <VaCard class="gb-card gb-empty__card">
                  <VaCardContent class="gb-empty__content">
                     <div class="gb-empty__icon-wrap">
                        <VaIcon name="fa-dna" size="large" class="gb-empty__icon" aria-hidden="true" />
                     </div>
                     <h3 class="gb-empty__title">{{ t('genomeBrowser.empty.title') }}</h3>
                     <p class="gb-empty__message">{{ t('genomeBrowser.empty.selectAssembly') }}</p>
                     <p class="gb-empty__hint">{{ t('genomeBrowser.empty.hint') }}</p>
                  </VaCardContent>
               </VaCard>
            </div>

            <template v-else>
               <div class="gb-main__content">
               <VaCard class="gb-card gb-main__summary">
                     <VaCardContent class="gb-summary__header">
                     <div class="gb-summary__header-info">
                        <h2 class="gb-summary__title">
                           {{ selectedAssembly.assembly_name }}
                           <span class="va-text-secondary gb-summary__scientific"
                              >({{ selectedAssembly.scientific_name }})</span
                           >
                        </h2>
                        <div class="gb-summary__meta">
                           <VaChip flat size="small">{{ selectedAssembly.accession }}</VaChip>
                           <span class="va-text-secondary">{{ t('genomeBrowser.assembly.sampleAccession') }}</span>
                           <VaChip flat size="small">{{ selectedAssembly.sample_accession }}</VaChip>
                           <span class="va-text-secondary">
                              {{ t('genomeBrowser.assembly.annotations') }}: {{ selectedAnnotations.length }}
                           </span>
                        </div>
                     </div>
                     <VaButton
                        preset="secondary"
                        size="small"
                        icon="fa-circle-info"
                        @click="openAssemblyDetails"
                     >
                        {{ t('item.details') }}
                     </VaButton>
                  </VaCardContent>
                  <VaCardContent class="gb-summary__annotations">
                     <h3 class="va-h6 gb-summary__annotations-title">{{ t('genomeBrowser.relatedAnnotations') }}</h3>
                     <p v-if="selectedAnnotations.length === 0" class="gb-summary__annotations-empty">
                        {{ t('genomeBrowser.noAnnotations') }}
                     </p>
                     <div v-else class="gb-summary__annotations-list">
                        <div
                           v-for="annotation in selectedAnnotations"
                           :key="annotation.name"
                           class="gb-summary__annotation-item"
                        >
                           <div class="gb-summary__annotation-info">
                              <span class="gb-summary__annotation-name">{{ annotation.name }}</span>
                              <span v-if="annotation.metadata?.description" class="gb-summary__annotation-desc">
                                 {{ annotation.metadata.description }}
                              </span>
                           </div>
                           <div class="gb-summary__annotation-actions">
                              <VaButton
                                 v-if="annotation.gff_gz_location"
                                 size="small"
                                 preset="secondary"
                                 icon="fa-file-arrow-down"
                                 :href="annotation.gff_gz_location"
                                 target="_blank"
                                 rel="noopener"
                              >
                                 {{ t('buttons.download') }}
                              </VaButton>
                              <VaButton
                                 size="small"
                                 preset="secondary"
                                 icon="fa-circle-info"
                                 @click="openAnnotationDetails(annotation)"
                              >
                                 {{ t('genomeBrowser.viewDetails') }}
                              </VaButton>
                           </div>
                        </div>
                     </div>
                  </VaCardContent>
                  </VaCard>

               <VaCard class="gb-card gb-main__viewer">
                  <VaCardContent class="gb-main__viewer-content">
                     <div v-if="isLoadingSelection" class="gb-main__loading">
                        <VaProgressCircle indeterminate size="large" color="primary" />
                        <span class="gb-main__loading-text">{{ t('genomeBrowser.loadingAssembly') }}</span>
                     </div>
                     <Jbrowse2
                        v-else
                        :default-session="defaultSession || undefined"
                        :assembly="selectedAssembly"
                        :annotations="selectedAnnotations"
                        :chromosomes="selectedChromosomes"
                     />
                  </VaCardContent>
               </VaCard>
               </div>
            </template>
         </section>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { computed, onMounted, ref, watch } from 'vue'
   import { useI18n } from 'vue-i18n'
   import { useRoute, useRouter } from 'vue-router'
   import { Assembly } from '../../data/types'
   import { Annotation } from '../../data/types'
   import { useGenomeBrowserStore } from '../../stores/genome-browser-store'
   import { useItemStore } from '../../stores/items-store'
   import Jbrowse2 from '../../components/Jbrowse2.vue'

   const { t } = useI18n()
   const route = useRoute()
   const router = useRouter()
   const gBStore = useGenomeBrowserStore()
   const itemStore = useItemStore()

   const searchTerm = ref('')
   const isLoadingAssemblies = ref(false)
   const isLoadingSelection = ref(false)
   const allLoaded = ref(false)
   const appliedRouteKey = ref('')
   let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null

   const assemblies = computed(() => gBStore.assemblies)
   const totalAssemblies = computed(() => gBStore.total)
   const selectedAssembly = computed(() => gBStore.selectedAssembly)
   const selectedChromosomes = computed(() => gBStore.selectedChromosomes)
   const selectedAnnotations = computed(() => gBStore.selectedAnnotations)
   const defaultSession = computed(() => gBStore.defaultSession)

   function normalizeQueryParam(value: unknown): string | undefined {
      if (Array.isArray(value)) return value[0] ? String(value[0]) : undefined
      if (value === null || value === undefined) return undefined
      return String(value)
   }

   async function fetchAssemblies(reset = true) {
      isLoadingAssemblies.value = true
      if (reset) gBStore.pagination.offset = 0
      gBStore.query.taxon_lineage = undefined
      await gBStore.fetchAssemblies(!reset)
      allLoaded.value = assemblies.value.length >= gBStore.total
      isLoadingAssemblies.value = false
   }

   function handleFilter() {
      if (filterDebounceTimer) clearTimeout(filterDebounceTimer)
      filterDebounceTimer = setTimeout(async () => {
         gBStore.query.filter = searchTerm.value.trim()
         await fetchAssemblies()
      }, 250)
   }

   async function fetchMoreAssemblies() {
      if (isLoadingAssemblies.value || allLoaded.value) return
      gBStore.pagination.offset += gBStore.pagination.limit
      await fetchAssemblies(false)
   }

   async function loadSelection(accession: string, annotation?: string) {
      isLoadingSelection.value = true
      const selection = await gBStore.initializeSelection(accession, annotation)
      isLoadingSelection.value = false
      if (!selection) return

      const finalAnnotation = selection.resolvedAnnotationName
      const nextQuery: Record<string, string> = { assembly: accession }
      if (annotation && finalAnnotation) nextQuery.annotation = finalAnnotation

      const nextKey = `${nextQuery.assembly || ''}|${nextQuery.annotation || ''}`
      appliedRouteKey.value = nextKey

      if (
         normalizeQueryParam(route.query.assembly) !== nextQuery.assembly ||
         normalizeQueryParam(route.query.annotation) !== (nextQuery.annotation || undefined)
      ) {
         await router.replace({ name: 'jbrowse', query: nextQuery })
      }
   }

   async function selectAssembly(assembly: Assembly) {
      await loadSelection(assembly.accession)
   }

   function openAssemblyDetails() {
      if (selectedAssembly.value) {
         itemStore.setSelectedItem('assemblies', selectedAssembly.value.accession)
      }
   }

   function openAnnotationDetails(annotation: Annotation) {
      itemStore.setSelectedItem('annotations', annotation.name)
   }

   watch(
      () => [route.query.assembly, route.query.annotation],
      async ([assemblyParam, annotationParam]) => {
         const assembly = normalizeQueryParam(assemblyParam)
         const annotation = normalizeQueryParam(annotationParam)
         const key = `${assembly || ''}|${annotation || ''}`
         if (key === appliedRouteKey.value) return

         if (!assembly) {
            gBStore.resetSelection()
            appliedRouteKey.value = ''
            return
         }
         await loadSelection(assembly, annotation)
      },
      { immediate: true },
   )

   onMounted(async () => {
      await fetchAssemblies(true)
   })
</script>

<style lang="scss" scoped>
   .gb-page {
      padding: 1.25rem 1.5rem 1.5rem;
      background: var(--va-background-secondary);
      min-height: 100%;
   }

   .gb-page__header {
      margin-bottom: 1rem;
   }

   .gb-page__kicker {
      margin: 0;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--va-primary);
      font-weight: 600;
   }

   .gb-page__title {
      margin: 0.2rem 0 0.35rem;
      font-size: 1.8rem;
      line-height: 1.25;
      color: var(--va-text-primary);
   }

   .gb-page__description {
      margin: 0;
      font-size: 0.95rem;
      color: var(--va-text-secondary);
   }

   .gb-grid {
      display: grid;
      grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
      min-height: calc(100vh - 180px);
   }

   .gb-card {
      border-radius: 12px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      background: var(--va-background-primary);
   }

   .gb-left__card {
      position: sticky;
      top: 5.25rem;
      max-height: calc(100vh - 6.25rem);
      display: flex;
      flex-direction: column;
   }

   .gb-left__title {
      margin: 0 0 0.65rem;
   }

   .gb-left__search {
      width: 100%;
   }

   .gb-left__hint {
      margin: 0.4rem 0 0;
      font-size: 0.75rem;
      color: var(--va-text-secondary);
      line-height: 1.35;
   }

   .gb-left__loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem 1rem;
   }

   .gb-left__loading-text {
      font-size: 0.875rem;
      color: var(--va-text-secondary);
   }

   .gb-left__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem 1rem;
      text-align: center;
   }

   .gb-left__empty-icon {
      opacity: 0.4;
      color: var(--va-text-secondary);
   }

   .gb-left__empty-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--va-text-secondary);
      line-height: 1.4;
   }

   .gb-left__list-wrap {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding-top: 0;
   }

   .gb-left__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
   }

   .gb-left__list-item {
      margin: 0;
      padding: 0;
   }

   .gb-left__item {
      width: 100%;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 10px;
      background: var(--va-background-primary);
      text-align: left;
      padding: 0.6rem 0.7rem;
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
   }

   .gb-left__item:hover {
      border-color: rgba(var(--va-primary-rgb, 59, 130, 246), 0.55);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      transform: translateY(-1px);
   }

   .gb-left__item:focus-visible {
      outline: 2px solid var(--va-primary);
      outline-offset: 2px;
   }

   .gb-left__item--active {
      border-color: rgba(var(--va-primary-rgb, 59, 130, 246), 0.65);
      box-shadow: 0 0 0 2px rgba(var(--va-primary-rgb, 59, 130, 246), 0.15);
   }

   .gb-left__item-title {
      font-weight: 600;
      color: var(--va-text-primary);
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .gb-left__item-subtitle {
      font-size: 0.82rem;
      color: var(--va-text-secondary);
      font-style: italic;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .gb-left__item-meta {
      margin-top: 0.2rem;
      font-size: 0.76rem;
      color: var(--va-text-secondary);
      opacity: 0.9;
   }

   .gb-left__loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem;
   }

   .gb-left__footer {
      padding-top: 0.5rem;
      font-size: 0.86rem;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }

   .gb-left__footer-text {
      color: var(--va-text-secondary);
   }

   .gb-main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .gb-main__content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      animation: gb-fade-in 0.25s ease-out;
   }

   @keyframes gb-fade-in {
      from {
         opacity: 0;
      }
      to {
         opacity: 1;
      }
   }

   .gb-empty__card {
      max-width: 28rem;
   }

   .gb-empty__content {
      text-align: center;
      padding: 2rem 1.5rem;
   }

   .gb-empty__icon-wrap {
      margin-bottom: 1rem;
   }

   .gb-empty__icon {
      color: var(--va-primary);
      opacity: 0.85;
   }

   .gb-empty__title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--va-text-primary);
   }

   .gb-empty__message {
      margin: 0.5rem 0 0;
      color: var(--va-text-secondary);
      line-height: 1.5;
   }

   .gb-empty__hint {
      margin: 1rem 0 0;
      font-size: 0.8125rem;
      color: var(--va-text-secondary);
      opacity: 0.9;
      line-height: 1.4;
   }

   /* Merged assembly + annotations summary card */
   .gb-main__summary {
      margin-bottom: 0;
   }

   .gb-summary__header {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      padding-bottom: 1rem;
   }

   .gb-summary__header-info {
      min-width: 0;
      flex: 1;
   }

   .gb-summary__title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      line-height: 1.35;
   }

   .gb-summary__scientific {
      font-style: italic;
      font-size: 0.95rem;
   }

   .gb-summary__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.35rem;
      font-size: 0.875rem;
   }

   .gb-summary__annotations {
      padding-top: 1rem;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
   }

   .gb-summary__annotations-title {
      margin: 0 0 0.75rem;
      font-size: 0.9375rem;
   }

   .gb-summary__annotations-empty {
      margin: 0;
      font-size: 0.875rem;
      color: var(--va-text-secondary);
      font-style: italic;
   }

   .gb-summary__annotations-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
   }

   .gb-summary__annotation-item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 0.9rem;
      background: var(--va-background-secondary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 8px;
   }

   .gb-summary__annotation-info {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
   }

   .gb-summary__annotation-name {
      font-weight: 600;
      color: var(--va-text-primary);
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .gb-summary__annotation-desc {
      font-size: 0.8125rem;
      color: var(--va-text-secondary);
      line-height: 1.4;
   }

   .gb-summary__annotation-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
   }

   .gb-main__viewer {
      width: 100%;
   }

   .gb-main__viewer-content {
      min-height: 68vh;
      height: 68vh;
      padding: 0.75rem;
   }

   .gb-main__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      height: 100%;
      min-height: 200px;
   }

   .gb-main__loading-text {
      font-size: 0.9375rem;
      color: var(--va-text-secondary);
   }

   .gb-empty p {
      margin: 0.3rem 0 0;
      color: var(--va-text-secondary);
   }

   @media (max-width: 1100px) {
      .gb-grid {
         grid-template-columns: 1fr;
      }

      .gb-left__card {
         position: static;
         max-height: none;
      }

      .gb-left__list-wrap {
         max-height: 300px;
      }
   }
</style>
