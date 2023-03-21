<template>
    <div>
      <va-breadcrumbs class="va-title" color="primary">
        <va-breadcrumbs-item active :to="{ name: 'local_samples'}" label="local-samples" />
      </va-breadcrumbs>
      <va-divider />
      <LocalSampleListBlock />
    </div>
  </template>
  <script setup lang="ts">
    import StatisticsService from '../../services/clients/StatisticsService'
    import { onMounted, reactive, ref } from 'vue'
    import LocalSampleListBlock from './LocalSampleListBlock.vue';
  
    const columns = [
      'scientific_name',
      'assembly_name',
      'assembly_level',
      'contig_n50',
      'submitter',
      'chromosomes',
      'size',
    ]
  

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
  