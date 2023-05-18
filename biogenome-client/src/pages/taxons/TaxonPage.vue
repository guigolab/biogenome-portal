<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'taxons' }" :label="t('taxonDetails.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <div class="row row-equal justify-end">
      <div class="flex">
        <va-button @click="showModal = !showModal" size="small">{{ t('relatedTaxon.header') }}</va-button>
      </div>
      <div class="flex lg12 md12 sm12 xs12">
        <TaxonListBlock />
      </div>
      <va-modal v-model="showModal" hide-default-actions no-esc-dismiss no-outside-dismiss no-dismiss fullscreen max-width="100vw">
        <RelatedTaxon />
      </va-modal>
    </div>
  </div>
</template>
<script setup lang="ts">
import TaxonListBlock from './TaxonListBlock.vue'
import RelatedTaxon from './RelatedTaxon.vue'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
const { t } = useI18n()
const showModal = ref(false)
</script>

<style lang="scss">
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
