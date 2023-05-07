<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'experiments' }" :label="t('experimentList.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <InfoBlock :charts="experimentInfoBlocks"/>
    <ExperimentListBlock />
  </div>
</template>
<script setup lang="ts">
  import ExperimentListBlock from './ExperimentListBlock.vue'
  import {experimentInfoBlocks} from '../../../config.json'
  import { useI18n } from 'vue-i18n'
  import InfoBlock from '../../components/InfoBlock.vue'
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
