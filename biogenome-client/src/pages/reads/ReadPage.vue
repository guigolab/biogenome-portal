<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'reads' }" :label="t('experimentList.breadcrumb')" />
      <va-breadcrumbs-item
        v-if="router.currentRoute.value.name === 'read'"
        active
        :label="router.currentRoute.value.params.accession"
      />
    </va-breadcrumbs>
    <va-divider />
    <ReadInfoBlock />
    <ReadListBlock />
  </div>
</template>
<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import ReadInfoBlock from './ReadInfoBlock.vue'
  import ReadListBlock from './ReadListBlock.vue'
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
