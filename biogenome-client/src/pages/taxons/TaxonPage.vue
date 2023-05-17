<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'taxons' }" :label="t('taxonDetails.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />

  <div class="row row-equal justify-end">
    <div class="flex">
      <va-button @click="showModal = !showModal" size="small">{{t('relatedTaxon.header')}}</va-button>
      <!-- launch modal -->
      <!-- <va-collapse
        stateful
        :header="t('relatedTaxon.header')"
      >
        <RelatedTaxon/>
      </va-collapse> -->
    </div>
    <div class="flex lg12 md12 sm12 xs12">
      <TaxonListBlock/>
    </div>
    <RelatedTaxon :show-modal="showModal"/>
  </div>
</div>
</template>
<script setup lang="ts">
  import TaxonListBlock from './TaxonListBlock.vue'
  import RelatedTaxon from './RelatedTaxon.vue'
  import { useI18n } from 'vue-i18n'
  import {ref} from 'vue'
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
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.5s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
</style>
