<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active label="bioprojects" />
    </va-breadcrumbs>
    <va-divider/>
    <div class="row row-equal">
      <!-- <div class="flex lg4 md4 sm12 xs12">
        <va-card>
          <va-card-title>
            <div class="row align-center justify-space-between">
              <div class="flex">
                <h1>BioProjects Contribution</h1>
              </div>
              <div style="padding: 0" class="flex">
                <va-button
                  :disabled="contributors.length <= step"
                  preset="secondary"
                  icon="chevron_right"
                  @click="showNext"
                />
              </div>
            </div>
          </va-card-title>
          <va-card-content>
            <div v-for="(contributor, idx) in visibleList" :key="idx" class="mb-3">
              <va-progress-bar :model-value="getPercent(contributor.contributions)" :color="getProgressBarColor(idx)">
                {{ contributor.contributions }} Organisms
              </va-progress-bar>
              <p class="mt-2">{{ contributor.name }}</p>
            </div>
          </va-card-content>
        </va-card>
      </div> -->
      <div class="flex lg12 md12 sm12 xs12">
        <BioProjectsListBlock />

      </div>
<!-- 
      <div class="flex lg8 md8 sm12 xs12">
        <va-card >
          <va-card-content style="max-height: 400px;overflow: scroll;">
            <va-list>
              <va-list-label> BioProjects </va-list-label>
              <va-list-item v-for="(bp, index) in bioprojects" :key="index" class="list__item" :to="{name:'bioproject', params:{accession:bp.accession}}">
                <va-list-item-section>
                  <va-list-item-label>
                    {{ bp.title }}
                  </va-list-item-label>

                  <va-list-item-label caption>
                    {{ bp.accession }}
                  </va-list-item-label>
                </va-list-item-section>
              </va-list-item>
            </va-list>
          </va-card-content>
        </va-card>
      </div> -->
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue-demi'
  import BioProjectService from '../../services/clients/BioProjectService'
  import { TBarChartData, Contributor } from '../../data/types'
  import colors from '../../data/colors'
import BioProjectsListBlock from './BioProjectsListBlock.vue'
  const selectedModel = ref('biosamples')
  const rootProject = 'PRJNA533106'
  const selectedBioproject = ref({
    accession: rootProject,
  })
  const initOptions = [
    {
      value: 'biosamples',
      label: 'BioSamples',
    },
    {
      value: 'reads',
      label: 'Reads',
    },
    {
      value: 'assemblies',
      label: 'Assemblies',
    },
  ]
  const accession = ref(rootProject)
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 3,
          boxWidth: 10,
        },
      },
    },
  }
  const bioprojects = ref([])
  const chartData = ref<TBarChartData>()
  const contributors = ref<Contributor[]>([])
  const progressMax = ref(0)
  const visibleList = ref<Contributor[]>([])
  const step = ref(10)
  const page = ref(0)
  const selectedData = computed(() => {
    return initOptions.findIndex((opt) => opt.value === selectedModel.value)
  })

  watch(selectedModel, () => {
    generateChart()
  })
  onMounted(async () => {
    const { data } = await BioProjectService.getBioprojectChildren(rootProject)
    bioprojects.value = [...data]
    getContributors(data)
    showNext()
    generateChart()
  })

  function generateChart() {
    const labels = initOptions[selectedData.value].label
    const datasets = bioprojects.value.map((bp, index) => {
      return {
        label: bp.title,
        backgroundColor: colors[index],
        data: [bp[initOptions[selectedData.value].value]],
      }
    })
    chartData.value = {
      labels: [labels],
      datasets: datasets,
    }

    console.log(chartData.value)
  }
  function getContributors(data) {
    contributors.value = data
      .sort((a, b) => b.leaves - a.leaves)
      .map((bp) => {
        return {
          name: bp.title,
          contributions: bp.leaves,
        }
      })
    progressMax.value = Math.max(...contributors.value.map(({ contributions }) => contributions))
  }

  function getPercent(val: number) {
    return (val / progressMax.value) * 100
  }

  function showNext() {
    const start = page.value * step.value

    const end = page.value * step.value + step.value

    visibleList.value = contributors.value.slice(start, end)

    page.value += 1

    const maxPages = (contributors.value.length - 1) / step.value

    if (page.value > maxPages) {
      page.value = 0
    }
  }

  function getProgressBarColor(idx: number) {
    const themeColors = ['primary', 'success', 'info', 'danger', 'warning']

    if (idx < themeColors.length) {
      return themeColors[idx]
    }

    const keys = Object.keys(themeColors)
    return themeColors[keys[(keys.length * Math.random()) << 0] as unknown as number]
  }

  // import BioProjectContainer from './BioProjectsContainer.vue'
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
