<template>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :label="t('annotationDetails.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <GenomeAnnotationListBlock/>
  </template>
  <script setup lang="ts">
    import GenomeAnnotationListBlock from './GenomeAnnotationListBlock.vue'
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
    .va-card {
      margin-bottom: 0 !important;
      &__title {
        display: flex;
        justify-content: space-between;
      }
    }
  
    .list__item + .list__item {
      margin-top: 10px;
    }
  </style>
  