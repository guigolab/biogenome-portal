<template>
   <VaLayout
      :bottom="{ fixed: true, order: 4 }"
      :top="{ fixed: true, order: 3 }"
      :right="{ fixed: true, absolute: true, order: 2 }"
   >
      <template #top>
         <NavBar />
      </template>
      <template #right>
         <Transition name="detail-slide">
            <aside v-if="hasItemDetail" class="data-layout-right">
               <header class="data-layout-right__header">
                  <div class="data-layout-right__header-title">
                     <VaIcon name="fa-circle-info" size="small" color="primary" />
                     <span class="data-layout-right__title">{{ t('item.details') }}</span>
                  </div>
                  <button class="data-layout-right__close" :aria-label="'Close'" @click="closeDetail">
                     <VaIcon name="fa-xmark" size="small" />
                  </button>
               </header>
               <div class="data-layout-right__body">
                  <DataItemDetail :id="(itemStore.selectedItemId as string)" :model="(itemStore.model as string)" />
               </div>
            </aside>
         </Transition>
      </template>
      <template #content>
         <main>
            <router-view v-slot="{ Component }">
               <Transition name="fade">
                  <component :is="Component" />
               </Transition>
            </router-view>
         </main>
      </template>
   </VaLayout>
</template>

<script setup lang="ts">
   import { useBreakpoint } from 'vuestic-ui'
   import NavBar from '../components/Navbar.vue'
   import DataItemDetail from '../components/DataItemDetail.vue'
   import { useTaxonomyStore } from '../stores/taxonomy-store'
   import { useItemStore } from '../stores/items-store'
   import { computed, inject, onMounted, ref } from 'vue'
   import {
      Chart as ChartJS,
      Title,
      Tooltip,
      Legend,
      BarElement,
      LineElement,
      LinearScale,
      PointElement,
      CategoryScale,
      ArcElement,
      Filler,
   } from 'chart.js'
   import { useStatsStore } from '../stores/stats-store'
   import { AppConfig, LangOption, TaxonNode, DataModels } from '../data/types'
   import { useRoute } from 'vue-router'
   import { useI18n } from 'vue-i18n'
   import TaxonService from '../services/TaxonService'

   ChartJS.register(
      Title,
      Tooltip,
      Legend,
      LineElement,
      LinearScale,
      PointElement,
      CategoryScale,
      Filler,
      ArcElement,
      BarElement,
   )

   const config = inject('appConfig') as AppConfig
   const { t } = useI18n()

   const breakpoints = useBreakpoint()
   const route = useRoute()

   const taxonomyStore = useTaxonomyStore()
   const statsStore = useStatsStore()
   const itemStore = useItemStore()

   const hasItemDetail = computed(() => Boolean(itemStore.selectedItemId && itemStore.model))

   function closeDetail() {
      itemStore.clearSelectedItem()
   }
   const dashboardDefaultTitle = 'BioGenome Portal'
   const dashboardDefaultDescription =
      'Welcome to the BioGenome Portal, explore all the data contained in this instance'

   const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'
   const rootTaxon = ref<TaxonNode>()

   onMounted(async () => {
      const { data } = await TaxonService.getTaxon(rootNode)
      rootTaxon.value = { ...data }
      await statsStore.getPortalStats(data as Record<string, unknown>)
   })

   interface HeroAction {
      text: string
      color: string
      icon?: string
      to?: { name: string }
      onClick?: () => void
   }

   interface HeaderConfig {
      title: string | LangOption
      description: string | LangOption
      actions?: HeroAction[]
   }

   const currentHeader = computed<HeaderConfig | undefined>(() => {
      switch (route.name) {
         case 'home': {
            const actions: HeroAction[] = [
               {
                  text: t('home.taxonomy.exploreBtn'),
                  to: { name: 'tree' },
                  color: 'primary',
                  icon: 'fa-diagram-project',
               },
            ]

            if (rootTaxon.value) {
               actions.push({
                  text: `${t('home.taxonomy.viewBtn')} ${rootTaxon.value.name}`,
                  onClick: () => updateTaxon(rootTaxon.value!),
                  color: 'secondary',
                  icon: 'fa-eye',
               })
            }

            return {
               title: (config.general.title as LangOption) ?? dashboardDefaultTitle,
               description: (config.general.description as LangOption) ?? dashboardDefaultDescription,
               actions,
            }
         }
         case 'tree':
            return {
               title: t('tree.title'),
               description: t('tree.description'),
            }
         case 'jbrowse':
            return {
               title: t('genomeBrowser.title'),
               description: t('genomeBrowser.description'),
            }
         case 'model': {
            const model = route.params.model as DataModels
            const modelConfig = config.models[model]
            const label = modelConfig?.label ?? modelConfig?.title
            return {
               title: (label as LangOption) ?? t(`models.${model}`),
               description: (modelConfig?.description as LangOption) ?? '',
            }
         }
         default:
            return undefined
      }
   })

   async function updateTaxon(taxon: TaxonNode) {
      taxonomyStore.currentTaxon = { ...taxon }
      taxonomyStore.showSidebar = true
   }
</script>

<style lang="scss" scoped>
   .layout {
      position: relative;
      min-height: calc(100vh - 64px); // Account for navbar height
   }

   .hero-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;

      .action-button {
         min-width: 200px;
      }
   }

   @media (max-width: 768px) {
      .hero-actions {
         flex-direction: column;
         align-items: center;

         .action-button {
            width: 100%;
            max-width: 300px;
         }
      }
   }

   /* Right detail sidebar (replaces TaxonSidebar) */
   .data-layout-right {
      display: flex;
      flex-direction: column;
      width: clamp(20rem, 36vw, 28rem);
      max-width: 95vw;
      height: 100%;
      background: var(--va-background-primary, var(--va-background-primary));
      border-left: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      box-shadow: -4px 0 32px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      z-index: 100;
   }

   .data-layout-right__header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.625rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      background: var(--va-background-element);
   }

   .data-layout-right__header-title {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
   }

   .data-layout-right__title {
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      margin: 0;
      line-height: 1.3;
   }

   .data-layout-right__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      background: var(--va-background-primary);
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
   }

   .data-layout-right__close:hover {
      background: var(--va-background-element);
      border-color: var(--va-primary);
      color: var(--va-primary);
   }

   .data-layout-right__body {
      flex: 1;
      overflow-y: auto;
   }

   .detail-slide-enter-active,
   .detail-slide-leave-active {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
   }

   .detail-slide-enter-from,
   .detail-slide-leave-to {
      transform: translateX(100%);
      opacity: 0;
   }
</style>
