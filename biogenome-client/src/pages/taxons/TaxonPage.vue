<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'taxons' }" :label="t('taxonDetails.breadcrumb')" />
    </va-breadcrumbs>
    <div>

    </div>
    <va-divider />

  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-collapse
        stateful
        :header="t('relatedTaxon.header')"
      >
        <RelatedTaxon/>
      </va-collapse>
    </div>
    <div class="flex lg12 md12 sm12 xs12">
      <TaxonListBlock/>
    </div>
  </div>
</div>
</template>
<script setup lang="ts">
  import TaxonListBlock from './TaxonListBlock.vue'
  import RelatedTaxon from './RelatedTaxon.vue'
  import { useI18n } from 'vue-i18n'
      
  const { t } = useI18n()

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
