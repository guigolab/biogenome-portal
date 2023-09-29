<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'organisms' }" :label="t('organismList.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <div class="row row-equal">
      <div class="flex lg12 md12">
        <OrganismListBlock />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import OrganismListBlock from './OrganismListBlock.vue'
  import { useI18n } from 'vue-i18n'
    
  const { t } = useI18n()
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
