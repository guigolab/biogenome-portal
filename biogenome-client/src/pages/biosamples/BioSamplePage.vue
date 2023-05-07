<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'biosamples', params: { savePosition: true } }" :label="t('biosampleList.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <InfoBlock :charts="bioSampleInfoBlocks"/>
    <BioSampleListBlock />
  </div>
</template>
<script setup lang="ts">
  import InfoBlock  from '../../components/InfoBlock.vue'
  import {bioSampleInfoBlocks} from '../../../config.json'
  import BioSampleListBlock from './BioSampleListBlock.vue'
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
