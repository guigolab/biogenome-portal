<template>
  <va-card style="height: 100%" class="d-flex dashboard-contributors-list">
    <va-card-title>
      <div class="row align-center justify-space-between">
        <div class="flex">
          <h1>assemblies published by project</h1>
        </div>
        <div class="flex">
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
      <va-inner-loading :loading="loading" style="width: 100%">
        <div v-for="(contributor, idx) in visibleList" :key="idx" class="mb-3">
          <va-progress-bar :model-value="getPercent(contributor.contributions)" :color="getProgressBarColor(idx)">
            {{ contributor.contributions }} assemblies
          </va-progress-bar>
          <p class="mt-2">{{ contributor.name }}</p>
        </div>
      </va-inner-loading>
    </va-card-content>
  </va-card>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import OrganismService from '../../../services/clients/OrganismService'
  import BioProjectService from '../../../services/clients/BioProjectService'

  const { t } = useI18n()

  interface IContributor {
    contributions: number
    name: string
  }

  const contributors = ref<IContributor[]>([])
  const loading = ref(false)
  const progressMax = ref(392)
  const visibleList = ref<IContributor[]>([])
  const step = ref(4)
  const page = ref(0)
  const root = 'PRJNA533106'

  onMounted(() => {
    loadContributorsList()
  })

  async function loadContributorsList() {
    loading.value = true
    const { data } = await BioProjectService.getBioProject(root)
    let promises = []
    const children = data.children.sort((a, b) => b.leaves - a.leaves)
    children.forEach((ch) => {
      promises.push(
        OrganismService.getOrganismStats({ bioproject: ch.accession }).then((response) => {
          ch.leaves = response.data.assemblies
        }),
      )
    })
    Promise.all(promises).then(() => {
      contributors.value = children.map((ch) => {
        return {
          name: ch.title,
          contributions: ch.leaves,
        }
      })
      progressMax.value = Math.max(...contributors.value.map(({ contributions }) => contributions))
      showNext()
      loading.value = false
    })
  }

  function getPercent(val: number) {
    return (val / progressMax.value) * 100
  }

  async function showNext() {
    const start = page.value * step.value

    const end = page.value * step.value + step.value

    const elements = contributors.value.slice(start, end)

    visibleList.value = elements

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

    // Get random color if idx out of colors array
    const keys = Object.keys(themeColors)
    return themeColors[keys[(keys.length * Math.random()) << 0] as unknown as number]
  }
</script>

<style scoped lang="scss">
  .dashboard-contributors-list {
    flex-direction: column;
    height: 100%;

    .inner-loading {
      height: 100%;
    }
  }
</style>
