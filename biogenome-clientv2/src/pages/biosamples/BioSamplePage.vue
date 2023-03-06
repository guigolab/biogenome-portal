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
  import StatisticsService from '../../services/clients/StatisticsService'
  import { onMounted, reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { Contributor } from '../../data/types'
  import { useBioSampleStore } from '../../stores/biosample-store'
  import BioSampleInfoBlock from './BioSampleInfoBlock.vue'
  import BioSampleListBlock from './BioSampleListBlock.vue'
  const router = useRouter()
  const biosampleStore = useBioSampleStore()

  function getSubmitters(value: Contributor[]) {
    biosampleStore.submitters = [...value]
  }
  const columns = [
    'scientific_name',
    'assembly_name',
    'assembly_level',
    'contig_n50',
    'submitter',
    'chromosomes',
    'size',
  ]
  const biosamplesCollected = ref({})
  const habitats = ref([])
  const pagination = reactive({
    total: 0,
    page: 0,
    limit: 10,
  })

  onMounted(async () => {
    const { data } = await StatisticsService.getModelFieldStats('biosamples', { field: 'metadata.habitat' })
    habitats.value = Object.keys(data)
      .map((k: string) => {
        return { label: k, value: data[k] }
      })
      .sort((a, b) => b.value - a.value)
    //   getAssemblies(await AssemblyService.getAssemblies({ offset: pagination.page, limit: pagination.limit }))
  })

  function getIcon(habitat: string) {
    const lowCase = habitat.toLowerCase()
    if (
      lowCase.includes('wood') ||
      lowCase.includes('leaves') ||
      lowCase.includes('tree') ||
      lowCase.includes('forest')
    )
      return 'forest'
    if (
      lowCase.includes('water') ||
      lowCase.includes('stream') ||
      lowCase.includes('aqua') ||
      lowCase.includes('marin') ||
      lowCase.includes('sea') ||
      lowCase.includes('wet') ||
      lowCase.includes('river')
    )
      return 'water'
    if (lowCase.includes('rock') || lowCase.includes('mount')) return 'landscape'
    if (lowCase.includes('wall') || lowCase.includes('city')) return 'apartment'

    if (
      lowCase.includes('garden') ||
      lowCase.includes('soil') ||
      lowCase.includes('botan') ||
      lowCase.includes('weed') ||
      lowCase.includes('grass')
    )
      return 'grass'
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
</style>
