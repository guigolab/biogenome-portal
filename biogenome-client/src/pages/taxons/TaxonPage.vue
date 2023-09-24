<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'taxons' }" :label="t('taxonDetails.breadcrumb')" />
    </va-breadcrumbs>
    <va-tabs v-model="tabValue" grow>
      <template #tabs>
        <va-tab v-for="tab in tabs" :key="tab.title" :name="tab.title">
          <va-icon class="mr-2" :name="tab.icon">
          </va-icon>
          {{ t(tab.title) }}
        </va-tab>
      </template>
    </va-tabs>
    <div class="row row-equal justify-end">
      <Transition name="slide-fade">
        <div v-if="tabValue === 'taxonomyTabs.table'" class="flex lg12 md12 sm12 xs12">
          <TaxonListBlock />
        </div>
        <div v-else-if="tabValue === 'taxonomyTabs.search'" class="flex lg12 md12 sm12 xs12">
          <RelatedTaxon />
        </div>
        <div v-else class="flex lg12 md12 sm12 xs12">
          <Suspense>
            <D3HyperTree :taxid="rootNode" />
            <template #fallback>
              <va-skeleton  animation="wave" :height="'90vh'" />
            </template>
          </Suspense>
        </div>
        <!-- <Pack :data="data" /> -->
      </Transition>
    </div>
  </div>
</template>
<script setup lang="ts">
import TaxonListBlock from './TaxonListBlock.vue'
import RelatedTaxon from './RelatedTaxon.vue'
// import Pack from '../../components/tree/Pack.vue'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
const { t } = useI18n()


const rootNode = import.meta.env.VITE_ROOT_NODE ?
  import.meta.env.VITE_ROOT_NODE : '131567'
// let data: any
const tabs = [
  {
    title: 'taxonomyTabs.table',
    icon: 'table_chart'
  },
  {
    title: 'taxonomyTabs.search',
    icon: 'search'
  },
  {
    title: 'taxonomyTabs.explorer',
    icon: 'travel_explore'
  }
]
const tabValue = ref(tabs[0].title)



</script>

<style lang="scss">
@import '../../styles/d3-hypertree-light.css';

.row-equal .flex {
  .va-card {
    height: 100%;
  }
}

.va-card {
  margin-bottom: 0 !important;

  &__title {
    display: flex;
    justify-content: space-between;
  }
}
</style>
