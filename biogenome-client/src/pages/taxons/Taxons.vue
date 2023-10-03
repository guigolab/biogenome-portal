<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'taxons' }" :label="t('taxonDetails.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <div class="row justify-end">
      <div class="flex">
        <va-button-toggle style="float: right;" icon-color="primary" v-model="tabValue" preset="secondary"
          border-color="primary" :options="tabs" value-by="icon" />
      </div>
    </div>
    <div class="row row-equal justify-center">
      <Transition name="slide-fade">
        <div v-if="tabValue === 'table_chart'" class="flex lg12 md12 sm12 xs12">
          <TaxonListBlock />
        </div>
        <div v-else-if="tabValue === 'search'" class="flex lg12 md12 sm12 xs12">
          <RelatedTaxon />
        </div>
        <div class="flex lg12 md12 sm12 xs12" v-else>
          <Suspense>
            <TaxonsTreeView />
            <template #fallback>
              <va-skeleton height="100vh"></va-skeleton>
            </template>
          </Suspense>
        </div>
      </Transition>
    </div>
  </div>
</template>
<script setup lang="ts">
import TaxonListBlock from './components/TaxonListBlock.vue'
import RelatedTaxon from './components/RelatedTaxon.vue'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { tabs } from './configs'
import TaxonsTreeView from './components/TaxonsTreeView.vue'
const { t } = useI18n()

const tabValue = ref(tabs[0].icon)



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

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
