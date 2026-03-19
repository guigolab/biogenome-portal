<template>
   <div class="landing-page">
      <!-- Hero: scientific, elegant, modern -->
      <section class="section section--hero">
         <div class="hero__bg" aria-hidden="true" />
         <div class="section__inner section__inner--hero">
            <p class="hero__kicker">{{ kicker }}</p>
            <h1 class="hero__title">{{ title }}</h1>
            <p class="hero__description">{{ description }}</p>
            <div class="hero__ctas">
               <VaButton
                  icon="fa-database"
                  color="primary"
                  size="large"
                  class="hero-cta hero-cta--primary"
                  :to="{ name: 'model', params: { model: 'organisms' } }"
               >
                  {{ t('home.cta1') }}
               </VaButton>
               <VaButton
                  color="secondary"
                  size="large"
                  class="hero-cta hero-cta--secondary"
                  :to="{ name: 'tree' }"
               >
                  {{ t('home.cta2') }}
               </VaButton>
            </div>
            <div class="hero__stats-wrap">
               <span class="hero__stats-label va-text-secondary">{{ t('home.hero.statsLabel') }}</span>
               <div class="hero__stats">
                  <div v-for="{ count, icon, color, key } in mappedCounts" :key="key" class="hero-stat-pill">
                     <VaIcon :color="color" :name="icon" size="small" class="hero-stat-pill__icon" />
                     <Counter :duration="2000" :target-value="count" custom-class="hero-stat-pill__value" />
                     <span class="hero-stat-pill__label va-text-secondary">{{ t(`models.${key}`) }}</span>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- Features: two-column on large screens, title + intro left, cards right -->
      <section class="section section--features">
         <div class="section__inner section__inner--features">
            <header class="features-header">
               <h2 class="features-header__title">{{ t('home.features.title') }}</h2>
               <p class="features-header__subtitle va-text-secondary">{{ t('home.features.subtitle') }}</p>
            </header>
            <div class="features-grid">
               <VaCard v-for="feat in features" :key="feat.title" :to="feat.route" class="feature-card">
                  <VaCardContent>
                     <div class="feature-card__body">
                        <VaIcon
                           :color="feat.color"
                           :name="feat.icon || 'fa-star'"
                           size="32px"
                           class="feature-card__icon"
                        />
                        <h3 class="feature-card__title">{{ t(feat.title) }}</h3>
                        <p class="feature-card__description va-text-secondary">{{ t(feat.description) }}</p>
                        <VaIcon name="fa-arrow-right" size="large" class="feature-card__arrow" />
                     </div>
                  </VaCardContent>
               </VaCard>
            </div>
         </div>
      </section>

      <!-- Goat Status -->
      <section v-if="hasGoat" class="section section--status">
         <div class="section--status__bg" aria-hidden="true" />
         <div class="section__inner section__inner--status">
            <p class="section__kicker section__kicker--status">{{ t('home.goat.kicker') }}</p>
            <div v-if="hasGoat" class="status-panel">
               <div class="status-block">
                  <div class="status-block__header">
                     <div>
                        <h2 class="status-panel__title">GOAT</h2>
                        <p class="status-panel__subtitle va-text-secondary">{{ t('home.goat.subtitle') }}</p>
                     </div>
                     <VaButton
                        @click="downloadGoatReport"
                        icon="fa-file-export"
                        color="primary"
                        size="medium"
                        :loading="goatReportLoading"
                        class="status-block__download-btn"
                     >
                        {{ t('buttons.goat') }}
                     </VaButton>
                  </div>
                  <PortalSequencingStatus
                     v-if="!goatStatusLoading && goatStatusSteps.length"
                     :steps="goatStatusSteps"
                     class="status-widget"
                  />
                  <div v-else-if="goatStatusLoading" class="section__loading">{{ t('loading') }}</div>
                  <div v-else-if="goatStatusError" class="section__error">{{ t('error') }}</div>
               </div>
            </div>
         </div>
         <div class="section--status__accent" aria-hidden="true" />
      </section>

      <!-- INSDC Status -->
      <section v-if="insdcStatus" class="section section--status">
         <div class="section--status__bg" aria-hidden="true" />
         <div class="section__inner section__inner--status">
            <p class="section__kicker section__kicker--status">{{ t('home.insdc.kicker') }}</p>
            <div class="status-panel">
               <div class="status-block">
                  <h2 class="status-panel__title">INSDC</h2>
                  <p class="status-panel__subtitle va-text-secondary">{{ t('home.insdc.subtitle') }}</p>
                  <PortalSequencingStatus
                     v-if="!insdcStatusLoading && insdcStatusSteps.length"
                     :steps="insdcStatusSteps"
                     class="status-widget"
                  />
                  <div v-else-if="insdcStatusLoading" class="section__loading">{{ t('loading') }}</div>
                  <div v-else-if="insdcStatusError" class="section__error">{{ t('error') }}</div>
               </div>
            </div>
         </div>
         <div class="section--status__accent" aria-hidden="true" />
      </section>
      <!-- Ranks: taxonomy data strip, narrow column -->
      <section class="section section--data">
         <div class="section--data__bg" aria-hidden="true" />
         <div class="section__inner section__inner--data">
            <p class="section__kicker section__kicker--data">{{ t('home.data.kicker') }}</p>
            <TaxonRanks />
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
   import { computed, inject, ref, Ref, onMounted } from 'vue'
   import { useStatsStore } from '../../stores/stats-store'
   import { AppConfig, LangOption } from '../../data/types'
   import { useI18n } from 'vue-i18n'
   import { iconMap } from '../../composable/useIconMap'
   import Counter from '../../components/Counter.vue'
   import { insdcSteps, goatSteps } from '../../composable/itemConfigs'
   import StatisticsService from '../../services/StatisticsService'
   import PortalSequencingStatus from '../../components/PortalSequencingStatus.vue'
   import TaxonRanks from '../../components/TaxonRanks.vue'
   import GoaTService from '../../services/GoaTService'
   import { useToast } from 'vuestic-ui/web-components'

   const { t, locale } = useI18n()
   const { init } = useToast()
   const statsStore = useStatsStore()
   const settings = inject('appConfig') as AppConfig

   const hasGoat = settings.general.goat // show goat status
   const insdcStatus = settings.general.insdcStatus // show INSDC status
   const dashboardDefaultTitle = 'BioGenome Portal'
   const dashboardDefaultKicker = 'BioGenome Portal'
   const dashboardDefaultDescription = 'Explore all the data contained in this instance'

   const computedLocale = computed(() => locale.value as 'en' | 'es-ct')
   const modelTitles = computed(() =>
      Object.fromEntries(
         Object.entries(settings.models)
            .filter(([, m]) => Boolean(m))
            .map(([k, m]) => [k, m!.title ?? m!.label])
            .filter(([, t]) => t),
      ),
   )

   const title = computed(() => (settings.general.title[computedLocale.value] as LangOption) ?? dashboardDefaultTitle)
   const description = computed(
      () => (settings.general.description[computedLocale.value] as LangOption) ?? dashboardDefaultDescription,
   )
   const kicker = computed(
      () => (settings.general?.kicker?.[computedLocale.value] as LangOption) ?? dashboardDefaultKicker,
   )
   const mappedCounts = computed(() =>
      statsStore.portalStats
         .filter(({ key, count }) => count > 0 && Object.keys(modelTitles.value).includes(key))
         .map(({ key, count }) => {
            const { icon, color } = iconMap[key]
            return { key, count, icon, color }
         }),
   )

   const dataExplorerFeature = {
      title: 'home.dataExplorerFeature.title',
      description: 'home.dataExplorerFeature.description',
      route: { name: 'model', params: { model: 'organisms' } },
      icon: 'fa-database',
      color: 'primary',
   }

   const defaultFeatures = [
      {
         title: 'home.taxExplorerFeature.title',
         description: 'home.taxExplorerFeature.description',
         route: { name: 'tree' },
         icon: 'fa-sitemap',
         color: 'success',
      },
      {
         title: 'home.mapExplorerFeature.title',
         description: 'home.mapExplorerFeature.description',
         route: { name: 'dataMap' },
         icon: 'fa-map-location-dot',
         color: 'warning',
      },
   ]

   const jbrowseFeature = {
      title: 'home.genomeBrowserFeature.title',
      route: { name: 'jbrowse' },
      description: 'home.genomeBrowserFeature.description',
      icon: 'fa-dna',
      color: 'info',
   }

   onMounted(async () => {
      if (insdcStatus) await fetchStatus('insdc_status', {})
      if (hasGoat) await fetchStatus('goat_status', {})
   })
   const features = computed(() =>
      settings.models?.assemblies
         ? [dataExplorerFeature, jbrowseFeature, ...defaultFeatures]
         : [dataExplorerFeature, ...defaultFeatures],
   )
   // Status refs
   const insdcStatusSteps = ref<any[]>([])
   const insdcStatusLoading = ref(false)
   const insdcStatusError = ref<null | any>(null)
   const goatStatusSteps = ref<any[]>([])
   const goatStatusLoading = ref(false)
   const goatStatusError = ref<null | any>(null)
   const targetListStatus = ref<Record<string, number>>({})
   const targetListLoading = ref(false)
   const targetListError = ref<null | any>(null)
   const goatReportLoading = ref(false)

   type StatusType = 'insdc_status' | 'goat_status'

   interface StatusState {
      steps: typeof insdcSteps | typeof goatSteps
      loading: Ref<boolean>
      error: Ref<any>
      value: Ref<any[]>
   }

   const statusStates: Record<StatusType, StatusState> = {
      insdc_status: {
         steps: insdcSteps,
         loading: insdcStatusLoading,
         error: insdcStatusError,
         value: insdcStatusSteps,
      },
      goat_status: {
         steps: goatSteps,
         loading: goatStatusLoading,
         error: goatStatusError,
         value: goatStatusSteps,
      },
   }

   async function fetchStatus(key: StatusType, query: Record<string, any>) {
      const state = statusStates[key]
      if (!state) return

      state.loading.value = true
      state.error.value = null

      try {
         const { data } = await StatisticsService.getModelFieldStats('organisms', key, query)
         const statusData = data as Record<string, number>

         if (key === 'goat_status') {
            // Also fetch target list status when fetching GOAT status
            targetListLoading.value = true
            try {
               const { data: targetData } = await StatisticsService.getModelFieldStats(
                  'organisms',
                  'target_list_status',
                  query,
               )
               targetListStatus.value = targetData as Record<string, number>
            } catch (err) {
               targetListError.value = err
               console.error('Error fetching target list status:', err)
            } finally {
               targetListLoading.value = false
            }
         }

         state.value.value = state.steps.map((step) => ({
            ...step,
            count: statusData[step.value] || 0,
         }))
      } catch (err) {
         state.error.value = err
         console.error(`Error fetching ${key}:`, err)
      } finally {
         state.loading.value = false
      }
   }

   async function downloadGoatReport() {
      try {
         goatReportLoading.value = true
         const response = await GoaTService.getGoatReport()
         const data = response.data
         const href = URL.createObjectURL(data)
         const name = 'goat_report.tsv'
         const link = document.createElement('a')
         link.href = href
         link.setAttribute('download', name)
         document.body.appendChild(link)
         link.click()
         document.body.removeChild(link)
         URL.revokeObjectURL(href)
      } catch (err) {
         console.error(err)
         init({ message: 'Error downloading Goat Report', color: 'danger' })
      } finally {
         goatReportLoading.value = false
      }
   }
</script>

<style lang="scss" scoped>
   .landing-page {
      --section-padding-y: 4.5rem;
      --section-padding-x: 1.5rem;
      --content-max-width: 1200px;
   }

   /* Shared section rhythm */
   .section {
      padding: var(--section-padding-y) var(--section-padding-x);
   }

   .section__inner {
      max-width: var(--content-max-width);
      margin: 0 auto;
   }

   .section__title {
      text-align: center;
      margin: 0 0 2rem 0;
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--va-text-primary);
   }

   .section__loading,
   .section__error {
      text-align: center;
      color: var(--va-text-secondary);
      padding: 1rem 0;
   }

   /* Hero: scientific, elegant, modern */
   .section--hero {
      position: relative;
      padding-top: 5.5rem;
      padding-bottom: 4rem;
      background: var(--va-background-secondary);
      display: flex;
      align-items: center;
      overflow: hidden;
   }

   .hero__bg {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0, 0, 0, 0.02) 0%, transparent 60%);
      pointer-events: none;
   }

   .hero__accent {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: min(200px, 40%);
      height: 2px;
      background: var(--va-primary);
      opacity: 0.35;
      border-radius: 1px;
   }

   .section__inner--hero {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      position: relative;
      z-index: 1;
   }

   .hero__kicker {
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--va-primary);
      margin: 0 0 1rem 0;
      opacity: 0.95;
   }

   .hero__title {
      font-size: clamp(2rem, 4.5vw, 3.25rem);
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: -0.025em;
      margin: 0 0 1.25rem 0;
      max-width: 580px;
      color: var(--va-text-primary);
   }

   .hero__description {
      font-size: 1.125rem;
      line-height: 1.65;
      max-width: 520px;
      margin: 0 0 2.5rem 0;
      color: var(--va-text-secondary);
   }

   .hero__ctas {
      display: flex;
      flex-wrap: wrap;
      gap: 0.875rem;
      justify-content: center;
      margin-bottom: 3.5rem;
   }

   .hero-cta {
      min-width: 160px;
   }

   .hero-cta--primary {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
   }

   .hero-cta--secondary {
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
   }

   .hero__stats-wrap {
      width: 100%;
      max-width: 640px;
      padding-top: 2.25rem;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }

   .hero__stats-label {
      display: block;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 1rem;
   }

   .hero__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
      align-items: center;
   }

   .hero-stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.4rem 0.875rem;
      background: var(--va-background-primary);
      border-radius: 8px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
   }

   .hero-stat-pill:hover {
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
      border-color: var(--va-background-border, rgba(0, 0, 0, 0.1));
   }

   .hero-stat-pill__icon {
      flex-shrink: 0;
      opacity: 0.9;
   }

   .hero-stat-pill__value {
      font-size: 0.9375rem;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--va-text-primary);
   }

   .hero-stat-pill__label {
      font-size: 0.75rem;
      font-weight: 500;
   }

   /* Features: two-column layout, header left, cards right */
   .section--features {
      background: var(--va-background-primary);
   }

   .section__inner--features {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2.5rem;
   }

   @media (min-width: 900px) {
      .section__inner--features {
         grid-template-columns: 280px 1fr;
         align-items: start;
         gap: 3rem;
      }
   }

   .features-header {
      text-align: center;
   }

   @media (min-width: 900px) {
      .features-header {
         text-align: left;
         position: sticky;
         top: 2rem;
      }
   }

   .features-header__title {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--va-text-primary);
   }

   .features-header__subtitle {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.5;
      max-width: 260px;
   }

   @media (min-width: 900px) {
      .features-header__subtitle {
         max-width: none;
      }
   }

   .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
   }

   .feature-card {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

      &:hover {
         box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
         border-color: var(--va-primary-light, rgba(0, 0, 0, 0.1));
         transform: translateY(-2px);
      }
   }

   .feature-card__body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      position: relative;
      padding: 0.25rem 0 0;
   }

   .feature-card__icon {
      flex-shrink: 0;
   }

   .feature-card__title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.3;
      color: var(--va-text-primary);
   }

   .feature-card__description {
      font-size: 0.9375rem;
      line-height: 1.5;
      margin: 0;
      flex-grow: 1;
   }

   .feature-card__arrow {
      align-self: flex-end;
      opacity: 0.6;
      transition: opacity 0.2s ease, transform 0.2s ease;
   }

   .feature-card:hover .feature-card__arrow {
      opacity: 1;
      transform: translateX(4px);
   }

   /* Status: refined panel, kicker, subtle bg */
   .section--status {
      position: relative;
      background: var(--va-background-secondary);
      overflow: hidden;
   }

   .section--status__bg {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(ellipse 70% 40% at 50% 100%, rgba(0, 0, 0, 0.02) 0%, transparent 55%);
      pointer-events: none;
   }

   .section--status__accent {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: min(120px, 25%);
      height: 2px;
      background: var(--va-primary);
      opacity: 0.25;
      border-radius: 1px;
   }

   .section__inner--status {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 1.25rem;
      position: relative;
      z-index: 1;
   }

   .section__kicker--status {
      text-align: center;
      margin-bottom: 0;
   }

   .status-panel {
      background: var(--va-background-primary);
      border-radius: 14px;
      padding: 2.25rem 2.5rem;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
   }

   .status-panel__title {
      margin: 0 0 0.35rem 0;
      font-size: 1.375rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--va-text-primary);
   }

   .status-panel__subtitle {
      margin: 0 0 1.5rem 0;
      font-size: 0.875rem;
      line-height: 1.45;
   }

   .status-block {
      width: 100%;
   }

   .status-block:not(:first-child) .section__title {
      margin-top: 0.5rem;
   }

   .status-block__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
   }

   .status-block__download-btn {
      flex-shrink: 0;
      font-weight: 600;
      min-width: 160px;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--va-primary) 35%, transparent);
      border: 1px solid color-mix(in srgb, var(--va-primary) 40%, transparent);

      &:hover {
         box-shadow: 0 4px 14px color-mix(in srgb, var(--va-primary) 45%, transparent);
      }

      &:active {
         box-shadow: 0 0 0 2px var(--va-primary);
      }
   }

   .status-divider {
      margin: 1.5rem 0;
      flex-shrink: 0;
   }

   .status-widget {
      width: 100%;
      max-width: 100%;
   }

   /* Data/Ranks: narrow column, kicker, subtle bg */
   .section--data {
      position: relative;
      background: var(--va-background-primary);
      overflow: hidden;
   }

   .section--data__bg {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0, 0, 0, 0.015) 0%, transparent 60%);
      pointer-events: none;
   }

   .section__inner--data {
      max-width: 680px;
      margin-left: auto;
      margin-right: auto;
      position: relative;
      z-index: 1;
   }

   .section__kicker--data {
      text-align: center;
      margin-bottom: 0.5rem;
   }

   /* Shared section kicker (status + data) */
   .section__kicker {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--va-primary);
      opacity: 0.9;
   }

   @media (max-width: 768px) {
      .landing-page {
         --section-padding-y: 3rem;
         --section-padding-x: 1rem;
      }

      .section--hero {
         padding-top: 4rem;
         padding-bottom: 3rem;
      }

      .hero__kicker {
         font-size: 0.75rem;
         letter-spacing: 0.1em;
         margin-bottom: 0.75rem;
      }

      .hero__ctas {
         margin-bottom: 2.5rem;
      }

      .hero__stats-wrap {
         padding-top: 1.75rem;
      }

      .hero__stats-label {
         margin-bottom: 0.75rem;
      }

      .hero__stats {
         gap: 0.375rem;
      }

      .hero-stat-pill {
         padding: 0.3rem 0.625rem;
      }

      .hero-stat-pill__value {
         font-size: 0.875rem;
      }

      .hero-stat-pill__label {
         font-size: 0.6875rem;
      }

      .section__inner--features {
         gap: 1.5rem;
      }

      .features-grid {
         grid-template-columns: 1fr;
      }

      .section__kicker {
         font-size: 0.6875rem;
         letter-spacing: 0.08em;
      }

      .status-panel {
         padding: 1.5rem 1.25rem;
         border-radius: 12px;
      }

      .status-panel__title {
         font-size: 1.25rem;
      }

      .status-panel__subtitle {
         margin-bottom: 1.25rem;
         font-size: 0.8125rem;
      }

      .section__inner--data {
         max-width: 100%;
      }
   }
</style>
