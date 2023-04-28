<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'experiments' }" :label="t('experimentList.breadcrumb')" />
      <va-breadcrumbs-item
        v-if="router.currentRoute.value.name === 'read'"
        active
        :label="router.currentRoute.value.params.accession"
      />
    </va-breadcrumbs>
    <va-divider />
    <ExperimentInfoBlock />
    <ExperimentListBlock />
  </div>
</template>
<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import ExperimentInfoBlock from './ExperimentInfoBlock.vue'
  import ExperimentListBlock from './ExperimentListBlock.vue'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const router = useRouter()

</script>

<style lang="scss">
  .chart {
    height: 400px;
  }
  .row-equal .flex {
    .va-card {
      height: 100%;
    }
  }
</style>
