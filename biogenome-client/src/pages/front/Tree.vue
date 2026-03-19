<template>
   <div class="tree-page">
      <header class="tree-page__header">
         <p class="tree-page__kicker">{{ t('tree.kicker') }}</p>
         <h1 class="tree-page__title">{{ t('tree.title') }}</h1>
         <p class="tree-page__description">{{ t('tree.description') }}</p>
      </header>

      <div class="tree-page__grid">
         <section class="tree-page__main" aria-label="Taxonomy tree">
            <VaCard class="tree-page__card">
               <VaCardContent class="tree-page__card-content">
                  <div class="tree-page__card-toolbar">
                     <Transition name="tree-page-fade">
                        <div
                           v-if="!taxonomyStore.currentTaxon"
                           class="tree-page__hint"
                        >
                           <VaIcon name="fa-circle-info" size="14px" color="primary" />
                           <span>{{ t('tree.noTaxonSelected') }}</span>
                        </div>
                        <div v-else class="tree-page__active-hint">
                           <VaIcon name="fa-circle-check" size="14px" color="success" />
                           <span class="tree-page__active-hint-name">{{ taxonomyStore.currentTaxon.name }}</span>
                           <span class="tree-page__active-hint-sep" />
                           <button
                              class="tree-page__active-hint-clear"
                              type="button"
                              :aria-label="t('data.clearSelection')"
                              @click="closePanel"
                           >
                              <VaIcon name="fa-xmark" size="11px" />
                              {{ t('data.clearSelection') }}
                           </button>
                        </div>
                     </Transition>
                     <button
                        class="tree-page__reset-btn"
                        type="button"
                        :title="t('tree.resetView')"
                        :aria-label="t('tree.resetView')"
                        @click="resetTreeView"
                     >
                        <VaIcon name="fa-compress" size="small" />
                     </button>
                  </div>
                  <div class="tree-container">
                     <TreeOfLifeCirclePack
                        ref="treeRef"
                        :highlight-taxid="taxonomyStore.currentTaxon?.taxid"
                        @taxon-select="onTaxonSelect"
                     />
                  </div>
               </VaCardContent>
            </VaCard>
         </section>

         <!-- Mobile backdrop -->
         <Transition name="tree-backdrop">
            <div
               v-if="taxonomyStore.currentTaxon"
               class="tree-page__backdrop"
               aria-hidden="true"
               @click="closePanel"
            />
         </Transition>

         <Transition name="tree-panel-slide">
            <aside
               v-if="taxonomyStore.currentTaxon"
               class="tree-page__right"
               aria-label="Selected taxon details"
               role="complementary"
            >
               <!-- Mobile drag handle -->
               <div class="tree-page__handle" aria-hidden="true" />

               <div class="tree-page__right-inner">
                  <header class="tree-page__right-header">
                     <div class="tree-page__right-header-title">
                        <VaIcon name="fa-circle-info" size="small" color="primary" />
                        <span class="tree-page__right-title">{{ t('tree.selectedTaxon') }}</span>
                     </div>
                     <button
                        class="tree-page__right-close"
                        type="button"
                        :aria-label="t('data.clearSelection')"
                        @click="closePanel"
                     >
                        <VaIcon name="fa-xmark" size="small" />
                     </button>
                  </header>

                  <div class="tree-page__right-body">
                     <!-- Ancestors breadcrumb -->
                     <nav
                        v-if="ancestorsCrumb.length"
                        class="tree-page__ancestors"
                        aria-label="Taxon ancestors"
                     >
                        <button
                           v-for="(ancestor, idx) in ancestorsCrumb"
                           :key="ancestor.taxid"
                           class="tree-page__ancestor-crumb"
                           type="button"
                           @click="onTaxonSelect(ancestor.taxid, ancestor)"
                        >
                           <VaIcon v-if="idx > 0" name="fa-chevron-right" size="9px" class="tree-page__ancestor-sep" />
                           <span>{{ ancestor.name }}</span>
                        </button>
                        <VaIcon name="fa-chevron-right" size="9px" class="tree-page__ancestor-sep" />
                        <span class="tree-page__ancestor-current">{{ taxonomyStore.currentTaxon.name }}</span>
                     </nav>

                     <!-- Taxon identity block -->
                     <div class="tree-page__taxon-info">
                        <div class="tree-page__taxon-badges">
                           <span
                              v-if="taxonomyStore.currentTaxon.rank"
                              class="tree-page__rank-badge"
                           >
                              {{ formatRank(taxonomyStore.currentTaxon.rank) }}
                           </span>
                           <span
                              v-if="taxonomyStore.currentTaxon.taxid"
                              class="tree-page__taxid-badge"
                           >
                              {{ t('tree.taxId') }}&thinsp;{{ taxonomyStore.currentTaxon.taxid }}
                           </span>
                        </div>
                        <h2 class="tree-page__taxon-name">{{ taxonomyStore.currentTaxon.name }}</h2>
                     </div>

                     <!-- Wiki summary -->
                     <TaxonSummary
                        :name="taxonomyStore.currentTaxon.name"
                        :rank="taxonomyStore.currentTaxon.rank"
                     />

                     <!-- Actions -->
                     <div class="tree-page__right-actions">
                        <VaButton
                           :color="organismsIcon?.color ?? 'primary'"
                           size="medium"
                           :icon="organismsIcon?.icon ?? 'fa-paw'"
                           class="tree-page__browse-btn"
                           @click="goToDataExplorer"
                        >
                           {{ t('tree.browseData') }}
                        </VaButton>
                        <VaButton
                           preset="secondary"
                           :color="mapIcon?.color ?? 'info'"
                           size="medium"
                           :icon="mapIcon?.icon ?? 'fa-map-location-dot'"
                           class="tree-page__browse-btn"
                           @click="goToMap"
                        >
                           {{ t('tree.viewOnMap') }}
                        </VaButton>
                     </div>
                  </div>
               </div>
            </aside>
         </Transition>
      </div>
   </div>
</template>

<script setup lang="ts">
   import TreeOfLifeCirclePack from '../../components/TreeOfLifeCirclePack.vue'
   import TaxonSummary from '../../components/TaxonSummary.vue'
   import { computed, ref } from 'vue'
   import { useI18n } from 'vue-i18n'
   import { useRouter } from 'vue-router'
   import type { TaxonNode } from '../../data/types'
   import { useTaxonomyStore } from '../../stores/taxonomy-store'
   import { iconMap } from '../../composable/useIconMap'

   const { t } = useI18n()
   const router = useRouter()
   const taxonomyStore = useTaxonomyStore()
   const treeRef = ref<InstanceType<typeof TreeOfLifeCirclePack> | null>(null)

   const organismsIcon = iconMap.organisms
   const mapIcon = iconMap.map

   const ancestorsCrumb = computed(() => {
      const raw = taxonomyStore.ancestors
      const root = taxonomyStore.rootNode
      const current = taxonomyStore.currentTaxon
      if (!current) return []

      // Ancestors API includes current taxon as last element — exclude it (we show it separately)
      let list = raw.length && raw[raw.length - 1]?.taxid === current.taxid ? raw.slice(0, -1) : raw

      // Never display parents of the root node; only root and its descendants
      if (root?.taxid) {
         const rootIdx = list.findIndex((a) => a.taxid === root.taxid)
         if (rootIdx >= 0) list = list.slice(rootIdx)
      }

      return list.length > 5 ? list.slice(-5) : list
   })

   async function onTaxonSelect(_taxid: string, taxon: TaxonNode) {
      await taxonomyStore.setCurrentTaxon(taxon)
   }

   function closePanel() {
      taxonomyStore.resetTaxon()
   }

   function formatRank(rank: string): string {
      return rank ? rank.charAt(0).toUpperCase() + rank.slice(1).replace(/_/g, ' ') : ''
   }

   function resetTreeView() {
      treeRef.value?.resetView()
   }

   function goToDataExplorer() {
      router.push({ name: 'model', params: { model: 'organisms' } })
   }

   function goToMap() {
      router.push({ name: 'dataMap' })
   }
</script>

<style lang="scss" scoped>
   .tree-page {
      padding: 1.25rem 1.5rem 1.5rem;
      background: var(--va-background-secondary);
      min-height: 100%;
   }

   /* ── Page header ── */
   .tree-page__header {
      margin-bottom: 1.25rem;
   }
   .tree-page__kicker {
      margin: 0;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--va-primary);
      font-weight: 700;
   }
   .tree-page__title {
      margin: 0.2rem 0 0.35rem;
      font-size: 1.8rem;
      line-height: 1.25;
      color: var(--va-text-primary);
   }
   .tree-page__description {
      margin: 0;
      font-size: 0.9rem;
      color: var(--va-text-secondary);
      max-width: 64ch;
      line-height: 1.5;
   }

   /* ── Two-column grid ── */
   .tree-page__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
      min-height: calc(100vh - 200px);
   }

   @media (min-width: 900px) {
      .tree-page__grid {
         grid-template-columns: minmax(0, 1fr) clamp(20rem, 30vw, 26rem);
      }
   }

   .tree-page__main {
      min-width: 0;
   }

   /* ── Tree card ── */
   .tree-page__card {
      border-radius: 12px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      background: var(--va-background-primary);
   }
   .tree-page__card-content {
      position: relative;
      padding: 0.75rem;
   }

   /* ── Card toolbar (hint + reset button) ── */
   .tree-page__card-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.625rem;
      min-height: 2rem;
   }
   .tree-page__hint {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--va-text-secondary);
      background: var(--va-background-element);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.07));
      border-radius: 20px;
      padding: 0.3rem 0.75rem;
   }
   .tree-page__active-hint {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      background: color-mix(in srgb, var(--va-success) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--va-success) 25%, transparent);
      border-radius: 20px;
      padding: 0.3rem 0.5rem 0.3rem 0.75rem;
      color: var(--va-text-secondary);
      overflow: hidden;
      max-width: 100%;
   }
   .tree-page__active-hint-name {
      font-weight: 600;
      font-style: italic;
      color: var(--va-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 18ch;
   }
   .tree-page__active-hint-sep {
      display: inline-block;
      width: 1px;
      height: 0.875rem;
      background: var(--va-background-border, rgba(0, 0, 0, 0.12));
      flex-shrink: 0;
   }
   .tree-page__active-hint-clear {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--va-text-secondary);
      background: none;
      border: none;
      padding: 0.15rem 0.25rem;
      cursor: pointer;
      border-radius: 4px;
      white-space: nowrap;
      flex-shrink: 0;
      transition: color 0.15s ease;

      &:hover {
         color: var(--va-danger);
      }
   }
   .tree-page__reset-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 8px;
      background: var(--va-background-element);
      color: var(--va-text-secondary);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

      &:hover {
         background: var(--va-background-primary);
         border-color: var(--va-primary);
         color: var(--va-primary);
      }
   }
   .tree-page-fade-enter-active,
   .tree-page-fade-leave-active {
      transition: opacity 0.2s ease;
      position: absolute;
   }
   .tree-page-fade-enter-from,
   .tree-page-fade-leave-to {
      opacity: 0;
   }

   .tree-container {
      width: 100%;
      overflow: hidden;
   }

   /* ── Right panel ── */
   .tree-page__backdrop {
      display: none;
   }

   .tree-page__handle {
      display: none;
   }

   .tree-page__right {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      position: sticky;
      top: 5.25rem;
      max-height: calc(100vh - 6.25rem);
   }

   @media (min-width: 900px) {
      .tree-page__right {
         width: clamp(20rem, 30vw, 26rem);
      }
   }

   .tree-page__right-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      overflow: hidden;
   }

   .tree-page__right-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.625rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      background: var(--va-background-element);
   }
   .tree-page__right-header-title {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
   }
   .tree-page__right-title {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      margin: 0;
      line-height: 1.3;
   }
   .tree-page__right-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.875rem;
      height: 1.875rem;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 8px;
      background: var(--va-background-primary);
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

      &:hover {
         background: color-mix(in srgb, var(--va-danger) 6%, var(--va-background-primary));
         border-color: var(--va-danger);
         color: var(--va-danger);
      }
   }

   .tree-page__right-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   /* ── Ancestors breadcrumb ── */
   .tree-page__ancestors {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.125rem;
      padding: 0.5rem 0.625rem;
      background: var(--va-background-element);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      font-size: 0.75rem;
   }
   .tree-page__ancestor-crumb {
      display: inline-flex;
      align-items: center;
      gap: 0.125rem;
      background: none;
      border: none;
      padding: 0.125rem 0.2rem;
      cursor: pointer;
      color: var(--va-primary);
      font-size: 0.75rem;
      border-radius: 4px;
      transition: background 0.15s ease;
      font-family: inherit;

      &:hover {
         background: color-mix(in srgb, var(--va-primary) 8%, transparent);
         text-decoration: underline;
      }

      span {
         white-space: nowrap;
         max-width: 12ch;
         overflow: hidden;
         text-overflow: ellipsis;
      }
   }
   .tree-page__ancestor-sep {
      color: var(--va-text-secondary);
      opacity: 0.5;
      flex-shrink: 0;
   }
   .tree-page__ancestor-current {
      font-weight: 600;
      color: var(--va-text-primary);
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 14ch;
      padding: 0.125rem 0.2rem;
   }

   /* ── Taxon identity block ── */
   .tree-page__taxon-info {
      padding-bottom: 0.875rem;
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }
   .tree-page__taxon-badges {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 0.5rem;
   }
   .tree-page__rank-badge {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--va-primary);
      background: color-mix(in srgb, var(--va-primary) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--va-primary) 20%, transparent);
      border-radius: 4px;
      padding: 0.125rem 0.5rem;
      line-height: 1.5;
   }
   .tree-page__taxid-badge {
      display: inline-block;
      font-size: 0.6875rem;
      font-family: ui-monospace, monospace;
      color: var(--va-text-secondary);
      background: var(--va-background-element);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 4px;
      padding: 0.125rem 0.5rem;
      line-height: 1.5;
   }
   .tree-page__taxon-name {
      font-size: 1.375rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.3;
      color: var(--va-text-primary);
      font-style: italic;
   }

   /* ── Action buttons ── */
   .tree-page__right-actions {
      margin-top: auto;
      padding-top: 0.875rem;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
   }
   .tree-page__browse-btn {
      width: 100%;
   }

   /* ── Panel slide transition (desktop: from right) ── */
   .tree-panel-slide-enter-active,
   .tree-panel-slide-leave-active {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
   }
   .tree-panel-slide-enter-from,
   .tree-panel-slide-leave-to {
      transform: translateX(1rem);
      opacity: 0;
   }

   /* ── Backdrop transition ── */
   .tree-backdrop-enter-active,
   .tree-backdrop-leave-active {
      transition: opacity 0.25s ease;
   }
   .tree-backdrop-enter-from,
   .tree-backdrop-leave-to {
      opacity: 0;
   }

   /* ── Mobile breakpoint ── */
   @media (max-width: 899px) {
      .tree-page__backdrop {
         display: block;
         position: fixed;
         inset: 0;
         z-index: 99;
         background: rgba(0, 0, 0, 0.35);
         backdrop-filter: blur(2px);
      }

      .tree-page__handle {
         display: block;
         width: 2.5rem;
         height: 4px;
         background: var(--va-background-border, rgba(0, 0, 0, 0.15));
         border-radius: 2px;
         margin: 0.5rem auto 0;
         flex-shrink: 0;
      }

      .tree-page__right {
         position: fixed;
         bottom: 0;
         left: 0;
         right: 0;
         z-index: 100;
         max-height: 72vh;
         width: 100%;
      }

      .tree-page__right-inner {
         border-radius: 16px 16px 0 0;
         max-height: 72vh;
         box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
      }

      /* Override slide: bottom sheet slides up on mobile */
      .tree-panel-slide-enter-from,
      .tree-panel-slide-leave-to {
         transform: translateY(100%);
         opacity: 1;
      }
   }

   @media (max-width: 768px) {
      .tree-page {
         padding: 1rem 1rem 1.25rem;
      }
      .tree-page__title {
         font-size: 1.5rem;
      }
      .tree-page__description {
         font-size: 0.85rem;
      }
   }
</style>
