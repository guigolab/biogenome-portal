<template>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active label="Genome Annotations" />
    </va-breadcrumbs>
    <va-divider />
    {{ annotations }}
  </template>
  <script setup lang="ts">
    import AssemblyService from '../../services/clients/AssemblyService'
    import { onMounted, reactive, ref } from 'vue'
    import { AxiosResponse } from 'axios'
    import { AssemblyAdapter } from '../../data/types'
    import { useRouter } from 'vue-router'
    import AnnotationService from '../../services/clients/AnnotationService'
  
    const router = useRouter()
    const props = defineProps({
      accession: String,
    })
  
    const annotations = ref([])
    const jbrowse = reactive({
      assembly: {},
      annotations: {}
    })
    const showJBrowse = ref(false)
    onMounted(async () => {
      getAnnotations(await AnnotationService.getAnnotations())
    })
  
    function getAnnotations({ data }: AxiosResponse) {
        annotations.value = [...data.data]
    }
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
  