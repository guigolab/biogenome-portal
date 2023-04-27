<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'assemblies' }" :label="t('assemblyDetails.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <AssemblyInfoBlock />
    <AssemblyListBlock />
  </div>
</template>
<script setup lang="ts">
  import AssemblyInfoBlock from './AssemblyInfoBlock.vue'
  import AssemblyListBlock from './AssemblyListBlock.vue'
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
