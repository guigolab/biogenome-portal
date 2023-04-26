<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'biosamples', params: { savePosition: true } }" label="biosamples" />
    </va-breadcrumbs>
    <va-divider />
    <BioSampleInfoBlock />
    <BioSampleListBlock />
  </div>
</template>
<script setup lang="ts">
  import BioSampleInfoBlock from './BioSampleInfoBlock.vue'
  import BioSampleListBlock from './BioSampleListBlock.vue'


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
