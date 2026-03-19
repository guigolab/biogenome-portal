<template>
   <div class="detail-panel">
      <!-- Loading -->
      <div v-if="loading" class="detail-panel__loading">
         <VaProgressCircle indeterminate size="small" color="primary" />
         <span class="detail-panel__loading-text">{{ t('taxon.loading') }}</span>
      </div>

      <template v-else-if="details">
         <!-- Hero: carousel or single avatar -->
         <div v-if="hasImages" class="detail-hero">
            <template v-if="allImages.length > 1">
               <div class="detail-hero__carousel">
                  <img :src="allImages[carouselIndex]" class="detail-hero__img" alt="" />
                  <button
                     class="detail-hero__nav detail-hero__nav--prev"
                     @click="prevImage"
                     aria-label="Previous image"
                  >
                     <VaIcon name="fa-chevron-left" size="small" />
                  </button>
                  <button
                     class="detail-hero__nav detail-hero__nav--next"
                     @click="nextImage"
                     aria-label="Next image"
                  >
                     <VaIcon name="fa-chevron-right" size="small" />
                  </button>
                  <div class="detail-hero__dots">
                     <button
                        v-for="(_, i) in allImages"
                        :key="i"
                        class="detail-hero__dot"
                        :class="{ 'detail-hero__dot--active': i === carouselIndex }"
                        @click="carouselIndex = i"
                        :aria-label="`Image ${i + 1}`"
                     />
                  </div>
               </div>
            </template>
            <div v-else class="detail-hero__single">
               <img :src="allImages[0]" class="detail-hero__img" alt="" />
            </div>
         </div>

         <!-- Header -->
         <header class="detail-header">
            <h2 class="detail-header__title">{{ details.title }}</h2>
            <p v-if="details.description" class="detail-header__desc">{{ details.description }}</p>
            <div v-if="details.vernacularNames?.length" class="detail-header__chips">
               <span
                  v-for="n in details.vernacularNames.slice(0, 4)"
                  :key="n.value || n.name || n"
                  class="detail-name-chip"
               >
                  {{ n.value || n.name || n }}
               </span>
            </div>
            <div v-if="hasExternalLinks" class="detail-header__external-links">
               <VaButton
                  v-if="details.ncbiLink"
                  size="small"
                  preset="secondary"
                  icon="fa-up-right-from-square"
                  :href="details.ncbiLink"
                  target="_blank"
               >
                  NCBI
               </VaButton>
               <VaButton
                  v-if="details.enaLink"
                  size="small"
                  preset="secondary"
                  icon="fa-up-right-from-square"
                  :href="details.enaLink"
                  target="_blank"
               >
                  ENA
               </VaButton>
               <VaButton
                  v-if="details.blobtoolkitLink"
                  size="small"
                  preset="secondary"
                  icon="fa-up-right-from-square"
                  :href="details.blobtoolkitLink"
                  target="_blank"
               >
                  Blobtoolkit
               </VaButton>
            </div>
         </header>

         <!-- Internal links -->
         <section v-if="hasInternalLinks" class="detail-section">
            <h3 class="detail-section__heading">{{ t('item.internalLinks') }}</h3>
            <div class="detail-section__btn-group">
               <VaButton
                  v-if="details.downloadLink"
                  size="small"
                  preset="secondary"
                  :color="iconMap.download?.color ?? 'secondary'"
                  :icon="iconMap.download?.icon ?? 'fa-file-arrow-down'"
                  :href="details.downloadLink"
               >
                  {{ t('buttons.download') }}
               </VaButton>
               <VaButton
                  v-if="details.speciesLink"
                  size="small"
                  preset="secondary"
                  :color="iconMap.organisms?.color ?? 'secondary'"
                  :icon="iconMap.organisms?.icon ?? 'fa-paw'"
                  @click="handleInternalLink(details.speciesLink)"
               >
                  {{ item?.scientific_name || item?.metadata?.scientific_name || t('models.organisms') }}
               </VaButton>
               <VaButton
                  v-if="details.assemblyLink"
                  size="small"
                  preset="secondary"
                  :color="iconMap.assemblies?.color ?? 'secondary'"
                  :icon="iconMap.assemblies?.icon ?? 'fa-dna'"
                  @click="handleInternalLink(details.assemblyLink)"
               >
                  {{ item?.assembly_name || item?.metadata?.assembly_name || t('models.assemblies') }}
               </VaButton>
               <VaButton
                  v-if="details.sampleLink"
                  size="small"
                  preset="secondary"
                  :color="iconMap.biosamples?.color ?? 'secondary'"
                  :icon="iconMap.biosamples?.icon ?? 'fa-vial'"
                  @click="handleInternalLink(details.sampleLink)"
               >
                  {{ item?.sample_accession || item?.metadata?.sample_accession || t('models.biosamples') }}
               </VaButton>
               <VaButton
                  v-if="details.jbrowseLink"
                  size="small"
                  preset="primary"
                  :color="iconMap.genomeBrowser?.color ?? 'primary'"
                  :icon="iconMap.genomeBrowser?.icon ?? 'fa-dna'"
                  @click="createGenomeBrowserSession"
               >
                  {{ t('item.genomeBrowserLink') }}
               </VaButton>
            </div>
         </section>

         <!-- Chromosomes (assembly: chromosome or complete genome only) -->
         <section v-if="showChromosomesSection" class="detail-section">
            <h3 class="detail-section__heading">{{ t('item.chromosomes') }}</h3>
            <Chromosomes
               :chromosomes="details.chromosomes ?? []"
               :selected-chromosomes="[]"
               :accession="id"
            />
         </section>

         <!-- INSDC Status -->
         <section v-if="details.insdcStatus" class="detail-section">
            <h3 class="detail-section__heading">{{ t('insdc.title') }}</h3>
            <div class="detail-status-track">
               <div
                  v-for="(step, i) in filteredInsdcStatus"
                  :key="step.value"
                  class="detail-status-step"
                  :class="{
                     'detail-status-step--done': insdcStatusIndex > i,
                     'detail-status-step--active': details.insdcStatus === step.value,
                  }"
                  :style="
                     step.color
                        ? { '--step-color': getStepColor(step.color) }
                        : undefined
                  "
               >
                  <div v-if="i > 0" class="detail-status-step__line" />
                  <div class="detail-status-step__row">
                     <div class="detail-status-step__dot">
                        <VaIcon :name="step.icon" size="10px" />
                     </div>
                     <div class="detail-status-step__content">
                        <span class="detail-status-step__label">{{ t(step.label) }}</span>
                        <span v-if="details.insdcStatus === step.value" class="detail-status-step__desc">
                           {{ t(step.description) }}
                        </span>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         <!-- GOAT Status -->
         <section v-if="hasGoat && details.goat?.status" class="detail-section">
            <h3 class="detail-section__heading">
               {{ t('goat.title') }}
               <span v-if="details.goat.targetList" class="detail-badge">
                  {{ details.goat.targetList.replace(/_/g, ' ') }}
               </span>
            </h3>
            <div class="detail-status-track">
               <div
                  v-for="(step, i) in filteredGoatStatus"
                  :key="step.value"
                  class="detail-status-step"
                  :class="{
                     'detail-status-step--done': goatStatusIndex > i,
                     'detail-status-step--active': details.goat.status === step.value,
                  }"
                  :style="
                     step.color
                        ? { '--step-color': getStepColor(step.color) }
                        : undefined
                  "
               >
                  <div v-if="i > 0" class="detail-status-step__line" />
                  <div class="detail-status-step__row">
                     <div class="detail-status-step__dot">
                        <VaIcon :name="step.icon" size="10px" />
                     </div>
                     <div class="detail-status-step__content">
                        <span class="detail-status-step__label">{{ t(step.label) }}</span>
                        <span v-if="details.goat.status === step.value" class="detail-status-step__desc">
                           {{ t(step.description) }}
                        </span>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         <!-- Related Data -->
         <section v-if="hasRelatedData.length" class="detail-section">
            <h3 class="detail-section__heading">{{ t('item.data') }}</h3>
            <div class="detail-related-grid">
               <div v-for="[k, v] in hasRelatedData" :key="k" class="detail-related-item">
                  <span class="detail-related-item__count">{{ Array.isArray(v) ? v.length : 0 }}</span>
                  <span class="detail-related-item__label">{{ t(`models.${k}`) }}</span>
               </div>
            </div>
         </section>

         <!-- Publications -->
         <section v-if="details.publications?.length" class="detail-section">
            <h3 class="detail-section__heading">{{ t('item.publications') }}</h3>
            <div class="detail-section__btn-group">
               <VaButton
                  v-for="pub in details.publications"
                  :key="pub.id"
                  size="small"
                  preset="secondary"
                  icon="fa-book-open"
                  :href="getLink(pub)"
                  target="_blank"
               >
                  {{ pub.source }}: {{ pub.id }}
               </VaButton>
            </div>
         </section>

         <!-- Coordinates map -->
         <section v-if="details.coordinates?.length" class="detail-section">
            <h3 class="detail-section__heading">{{ t('item.coordinates') }}</h3>
            <div class="detail-map">
               <LeafletMap
                  :key="id"
                  :selected-countries="[]"
                  map-type="points"
                  :countries="[]"
                  :locations="details.coordinates"
               />
            </div>
         </section>

         <!-- Metadata (least important, last) -->
         <section
            v-if="details.metadata && Object.keys(details.metadata).length"
            class="detail-section detail-section--last"
         >
            <h3 class="detail-section__heading">{{ t('item.metadata') }}</h3>
            <MetadataTreeCard :id="id" :metadata="Object.entries(details.metadata)" />
         </section>
      </template>
   </div>
</template>

<script setup lang="ts">
   import { computed, inject, ref, watch } from 'vue'
   import { useRouter, useRoute } from 'vue-router'
   import { useI18n } from 'vue-i18n'
   import { useItemStore } from '../stores/items-store'
   import type { AppConfig, DataModels, ItemDetails } from '../data/types'
   import { dataModels } from '../data/types'
   import MetadataTreeCard from './MetadataTreeCard.vue'
   import LeafletMap from './LeafletMap.vue'
   import Chromosomes from './Chromosomes.vue'
   import { iconMap } from '../composable/useIconMap'
   import { getLink, getIdKey, goatSteps, insdcSteps, extendedModels } from '../composable/itemConfigs'

   const props = defineProps<{
      model: string
      id: string
   }>()

   const { t } = useI18n()
   const router = useRouter()
   const route = useRoute()
   const itemStore = useItemStore()
   const settings = inject<AppConfig>('appConfig')
   const hasGoat = settings?.general?.goat ?? false

   function getStepColor(colorKey: string | undefined): string {
      const key = colorKey || 'primary'
      const vars = settings?.ui?.colors?.variables
      if (vars && key in vars && typeof vars[key] === 'string') {
         return vars[key] as string
      }
      return `var(--va-${key})`
   }

   const loading = ref(true)
   const details = ref<ItemDetails | null>(null)
   const item = computed(() => itemStore.item)
   const carouselIndex = ref(0)

   const filteredInsdcStatus = insdcSteps.filter((step) => step.value !== 'No Entry')
   const filteredGoatStatus = goatSteps.filter((step) => step.value !== 'No Entry')

   const allImages = computed(() => {
      const imgs: string[] = []
      if (details.value?.avatar) imgs.push(details.value.avatar)
      if (details.value?.images?.length) {
         for (const url of details.value.images) {
            if (!imgs.includes(url)) imgs.push(url)
         }
      }
      return imgs
   })

   const hasImages = computed(() => allImages.value.length > 0)

   const insdcStatusIndex = computed(() =>
      filteredInsdcStatus.findIndex((s) => s.value === details.value?.insdcStatus),
   )

   const goatStatusIndex = computed(() =>
      filteredGoatStatus.findIndex((s) => s.value === details.value?.goat?.status),
   )

   const hasInternalLinks = computed(
      () =>
         details.value &&
         (details.value.speciesLink ||
            details.value.sampleLink ||
            details.value.downloadLink ||
            details.value.jbrowseLink ||
            details.value.assemblyLink),
   )

   const assemblyLevel = computed(() => {
      const level =
         details.value?.metadata?.assembly_info?.assembly_level ??
         (item.value as any)?.metadata?.assembly_info?.assembly_level
      return typeof level === 'string' ? level.trim().toLowerCase() : ''
   })

   const showChromosomesSection = computed(
      () =>
         props.model === 'assemblies' &&
         (details.value?.chromosomes?.length ?? 0) > 0 &&
         (assemblyLevel.value === 'chromosome' || assemblyLevel.value === 'complete genome'),
   )
   const hasExternalLinks = computed(
      () => details.value && (details.value.ncbiLink || details.value.enaLink || details.value.blobtoolkitLink),
   )
   const hasRelatedData = computed(() => {
      if (!details.value) return []
      return Object.entries(details.value).filter(
         ([k, v]) => extendedModels.includes(k) && v && Array.isArray(v) && v.length > 0,
      )
   })

   function prevImage() {
      carouselIndex.value = (carouselIndex.value - 1 + allImages.value.length) % allImages.value.length
   }

   function nextImage() {
      carouselIndex.value = (carouselIndex.value + 1) % allImages.value.length
   }

   function handleInternalLink(link: { name?: string; params?: { model: string; id: string } } | undefined) {
      const params = link?.params
      if (!params?.model || !params?.id) return
      const model = params.model as DataModels
      const id = params.id
      itemStore.setSelectedItem(model, id)
      if (route.name === 'model' || route.name === 'item' || route.name === 'dataMap') {
         router.push({ name: 'item', params: { model, id } })
      }
   }

   async function loadItem() {
      if (!props.model || !props.id || !dataModels.includes(props.model as DataModels)) return
      loading.value = true
      try {
         const data = await itemStore.fetchItem(props.model as DataModels, props.id)
         itemStore.item = data
         itemStore.itemId = props.id
         await getRelatedData(props.model as DataModels, props.id)
      } finally {
         loading.value = false
      }
   }

   async function getRelatedData(model: DataModels, id: string) {
      const currentItem = itemStore.item
      if (!currentItem) return
      let relatedData: any
      if (model === 'assemblies') {
         relatedData = await itemStore.fetchAssemblyData(id)
         details.value = {
            title: currentItem.assembly_name,
            description: `Accession: ${id}`,
            ncbiLink: `https://www.ncbi.nlm.nih.gov/assembly/${id}`,
            enaLink: `https://www.ebi.ac.uk/ena/browser/view/${id}`,
            jbrowseLink: relatedData?.chromosomes?.length > 0,
            speciesLink: { name: 'item', params: { model: 'organisms', id: currentItem.taxid } },
            sampleLink: { name: 'item', params: { model: 'biosamples', id: currentItem.sample_accession } },
            blobtoolkitLink: currentItem.blobtoolkit_id
               ? `https://blobtoolkit.genomehubs.org/view/${id}#Filters`
               : undefined,
            metadata: currentItem.metadata,
            ...(relatedData ?? {}),
         }
      } else if (model === 'reads') {
         relatedData = await itemStore.fetchReadRunSiblingsByExperiment(currentItem.experiment_accession)
         details.value = {
            title: currentItem.run_accession,
            description: currentItem.metadata?.experiment_title,
            ncbiLink: `https://www.ncbi.nlm.nih.gov/sra/${currentItem.run_accession}`,
            enaLink: `https://www.ebi.ac.uk/ena/browser/view/${currentItem.run_accession}`,
            speciesLink: { name: 'item', params: { model: 'organisms', id: currentItem.taxid } },
            sampleLink: {
               name: 'item',
               params: {
                  model: 'biosamples',
                  id: currentItem.sample_accession || currentItem.metadata?.sample_accession,
               },
            },
            metadata: currentItem.metadata,
            ...(relatedData ?? {}),
         }
      } else if (model === 'biosamples') {
         relatedData = await itemStore.fetchBioSampleData(id)
         details.value = {
            title: currentItem.accession,
            description: currentItem.metadata?.tissue,
            ncbiLink: `https://www.ncbi.nlm.nih.gov/biosample/${id}`,
            enaLink: `https://www.ebi.ac.uk/ena/browser/view/${id}`,
            speciesLink: { name: 'item', params: { model: 'organisms', id: currentItem.taxid } },
            sampleLink: currentItem.metadata?.['sample derived from']
               ? { name: 'item', params: { model: 'biosamples', id: currentItem.metadata['sample derived from'] } }
               : undefined,
            metadata: currentItem.metadata,
            ...(relatedData ?? {}),
         }
      } else if (model === 'local_samples') {
         relatedData = await itemStore.fetchLocalSampleData(id)
         details.value = {
            title: currentItem.local_id,
            description: currentItem.metadata?.tissue || '',
            speciesLink: { name: 'item', params: { model: 'organisms', id: currentItem.taxid } },
            metadata: currentItem.metadata,
            ...(relatedData ?? {}),
         }
      } else if (model === 'organisms') {
         relatedData = await itemStore.fetchOrganismData(id)
         details.value = {
            title: currentItem.scientific_name,
            description: currentItem.insdc_common_name ?? `Taxid: ${currentItem.taxid}`,
            ncbiLink: `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${currentItem.taxid}`,
            enaLink: `https://www.ebi.ac.uk/ena/browser/view/${id}`,
            metadata: currentItem.metadata ?? {},
            sequencing_type: currentItem.sequencing_type,
            sub_project: currentItem.sub_project,
            images: currentItem.image_urls,
            avatar: currentItem.image,
            insdcStatus: currentItem.insdc_status,
            goat: {
               targetList: currentItem.target_list_status,
               status: currentItem.goat_status,
            },
            publications: currentItem.publications,
            vernacularNames: currentItem.common_names,
            ...(relatedData ?? {}),
         }
      } else {
         details.value = {
            title: currentItem.name,
            description: '',
            jbrowseLink: true,
            assemblyLink: { name: 'item', params: { model: 'assemblies', id: currentItem.assembly_accession } },
            speciesLink: { name: 'item', params: { model: 'organisms', id: currentItem.taxid } },
            metadata: currentItem.metadata,
            downloadLink: currentItem.gff_gz_location,
            ...(relatedData ?? {}),
         }
      }
   }

   async function createGenomeBrowserSession() {
      if (!item.value) return
      if (props.model === 'annotations') {
         await router.push({
            name: 'jbrowse',
            query: { assembly: item.value.assembly_accession, annotation: item.value.name },
         })
         return
      }

      const accession = item.value.accession || item.value.assembly_accession
      await router.push({ name: 'jbrowse', query: { assembly: accession } })
   }

   watch(
      () => [props.model, props.id],
      () => {
         details.value = null
         carouselIndex.value = 0
         if (props.model && props.id) loadItem()
      },
      { immediate: true },
   )
</script>

<style lang="scss" scoped>
   /* ─── Panel shell ─── */
   .detail-panel {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      --detail-space-xs: 0.375rem;
      --detail-space-sm: 0.5rem;
      --detail-space-md: 0.625rem;
      --detail-space-lg: 0.875rem;
      --detail-pad-x: 1rem;
      --detail-font-title: 1.375rem;
      --detail-font-body: 0.9375rem;
      --detail-font-secondary: 0.875rem;
      --detail-font-meta: 0.8125rem;
      --detail-font-kicker: 0.75rem;
   }

   /* ─── Loading ─── */
   .detail-panel__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--detail-space-md);
      padding: 2rem var(--detail-pad-x);
   }

   .detail-panel__loading-text {
      font-size: var(--detail-font-secondary);
      line-height: 1.45;
      color: var(--va-text-secondary);
   }

   /* ─── Hero image / carousel ─── */
   .detail-hero {
      position: relative;
      width: 100%;
      background: var(--va-background-element, rgba(0, 0, 0, 0.04));
      overflow: hidden;
   }

   .detail-hero__carousel,
   .detail-hero__single {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
   }

   .detail-hero__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
   }

   /* Nav arrows */
   .detail-hero__nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      cursor: pointer;
      transition: background 0.2s ease;
      z-index: 2;

      &:hover {
         background: rgba(0, 0, 0, 0.65);
      }

      &--prev {
         left: 0.5rem;
      }

      &--next {
         right: 0.5rem;
      }
   }

   /* Dot indicators */
   .detail-hero__dots {
      position: absolute;
      bottom: 0.5rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 0.375rem;
      z-index: 2;
   }

   .detail-hero__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      padding: 0;
      transition: background 0.2s ease, transform 0.2s ease;

      &--active {
         background: #fff;
         transform: scale(1.3);
      }
   }

   /* ─── Header ─── */
   .detail-header {
      padding: var(--detail-space-lg) var(--detail-pad-x) 0;
   }

   .detail-header__title {
      font-size: var(--detail-font-title);
      font-weight: 600;
      letter-spacing: -0.02em;
      margin: 0 0 var(--detail-space-xs) 0;
      color: var(--va-text-primary);
      line-height: 1.3;
   }

   .detail-header__desc {
      font-size: var(--detail-font-body);
      color: var(--va-text-secondary);
      margin: 0 0 var(--detail-space-md) 0;
      line-height: 1.5;
   }

   .detail-header__chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--detail-space-sm);
      margin-top: var(--detail-space-sm);
   }

   .detail-header__external-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--detail-space-sm);
      margin-top: var(--detail-space-md);

      :deep(.va-button) {
         font-size: var(--detail-font-meta);
         border-radius: 999px;
      }
   }

   .detail-name-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      font-size: var(--detail-font-meta);
      font-weight: 500;
      background: var(--va-background-element, rgba(0, 0, 0, 0.04));
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 999px;
      color: var(--va-text-secondary);
      line-height: 1.45;
   }

   /* ─── Sections ─── */
   .detail-section {
      padding: var(--detail-space-lg) var(--detail-pad-x) 0;

      &--last {
         padding-bottom: var(--detail-space-lg);
      }

      & + .detail-section {
         border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
         margin-top: var(--detail-space-lg);
      }
   }

   .detail-section__heading {
      display: flex;
      align-items: center;
      gap: var(--detail-space-sm);
      font-size: var(--detail-font-kicker);
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      margin: 0 0 var(--detail-space-md) 0;
      line-height: 1.3;
   }

   .detail-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      font-size: var(--detail-font-kicker);
      font-weight: 500;
      letter-spacing: 0.02em;
      text-transform: none;
      background: rgba(var(--va-primary-rgb, 59, 130, 246), 0.1);
      color: var(--va-primary);
      border-radius: 999px;
      border: 1px solid rgba(var(--va-primary-rgb, 59, 130, 246), 0.2);
      line-height: 1.4;
   }

   /* ─── Button group ─── */
   .detail-section__btn-group {
      display: flex;
      flex-direction: column;
      gap: var(--detail-space-sm);

      :deep(.va-button) {
         justify-content: flex-start;
         width: 100%;
         font-size: var(--detail-font-secondary);
         font-weight: 500;
         border-radius: 12px;
         text-overflow: ellipsis;
         overflow: hidden;
         white-space: nowrap;
      }
   }

   /* ─── Status track ─── */
   .detail-status-track {
      display: flex;
      flex-direction: column;
      padding-left: 0.25rem;
   }

   .detail-status-step {
      position: relative;
      padding-left: 1.75rem;
   }

   .detail-status-step__line {
      position: absolute;
      left: 0.375rem;
      top: -0.625rem;
      bottom: calc(100% - 0.375rem);
      width: 2px;
      height: 0.75rem;
      background: var(--va-background-border, rgba(0, 0, 0, 0.1));

      .detail-status-step--done + .detail-status-step & {
         background: var(--step-color, var(--va-primary));
         opacity: 0.6;
      }

      .detail-status-step--active + .detail-status-step & {
         background: var(--step-color, var(--va-primary));
         opacity: 0.6;
      }
   }

   .detail-status-step__row {
      display: flex;
      align-items: flex-start;
      gap: var(--detail-space-md);
      padding-bottom: var(--detail-space-md);
   }

   .detail-status-step__dot {
      position: absolute;
      left: 0;
      top: 0.125rem;
      width: 0.875rem;
      height: 0.875rem;
      border-radius: 50%;
      border: 2px solid var(--va-background-border, rgba(0, 0, 0, 0.15));
      background: var(--va-background-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      flex-shrink: 0;
      transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

      .detail-status-step--done & {
         border-color: var(--step-color, var(--va-primary));
         background: var(--step-color, var(--va-primary));
         color: #fff;
         opacity: 0.7;
      }

      .detail-status-step--active & {
         border-color: var(--step-color, var(--va-primary));
         background: var(--step-color, var(--va-primary));
         color: #fff;
         opacity: 1;
         box-shadow: 0 0 0 3px color-mix(in srgb, var(--step-color, var(--va-primary)) 25%, transparent);
      }
   }

   .detail-status-step__content {
      display: flex;
      flex-direction: column;
      gap: var(--detail-space-xs);
      min-width: 0;
   }

   .detail-status-step__label {
      font-size: var(--detail-font-secondary);
      font-weight: 500;
      color: var(--va-text-secondary);
      line-height: 1.35;

      .detail-status-step--active & {
         color: var(--step-color, var(--va-primary));
         font-weight: 600;
      }

      .detail-status-step--done & {
         color: var(--va-text-secondary);
      }
   }

   .detail-status-step__desc {
      font-size: var(--detail-font-meta);
      color: var(--va-text-secondary);
      line-height: 1.45;
      opacity: 0.85;
   }

   /* ─── Related data grid ─── */
   .detail-related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: var(--detail-space-sm);
   }

   .detail-related-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--detail-space-xs);
      padding: var(--detail-space-lg) var(--detail-space-md);
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 10px;
      text-align: center;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &:hover {
         border-color: var(--va-primary);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      }
   }

   .detail-related-item__count {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--va-primary);
      line-height: 1.2;
      letter-spacing: -0.02em;
   }

   .detail-related-item__label {
      font-size: var(--detail-font-kicker);
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      line-height: 1.3;
   }

   /* ─── Map ─── */
   .detail-map {
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      height: 220px;

      :deep(.map-container) {
         height: 100%;
      }

      :deep(.leaflet-map) {
         height: 100%;
      }

      :deep(.leaflet-container) {
         height: 100%;
         border-radius: 10px;
      }
   }
</style>
