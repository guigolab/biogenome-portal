<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <ContributorList
          :field="'metadata.GAL'"
          :model="'biosamples'"
          :title="'biosampleList.charts.contributorList'"
          @list-created="getSubmitters"
        />
      </Suspense>
    </div>
    <div class="flex lg6 md6 sm12 xs12">
      <Suspense>
        <DateLineChart
          :label="'biosampleList.charts.dateLineChart.label'"
          :field="'metadata.collection_date'"
          :title="'biosampleList.charts.dateLineChart.title'"
          :model="'biosamples'"
          :color="'#2c82e0'"
        />
      </Suspense>
    </div>
    <div class="flex lg3 md3 sm12 xs12">
      <va-card class="px-3">
        <va-card-title> {{ t('biosampleList.charts.habitatList') }} </va-card-title>
        <va-card-content style="max-height: 350px; overflow: scroll">
          <va-list class="py-4">
            <template v-for="(habitat, i) in habitats" :key="i">
              <va-list-item>
                <va-list-item-section icon>
                  <va-icon size="large" color="info" :name="getIcon(habitat.label)" />
                </va-list-item-section>

                <va-list-item-section>
                  <va-list-item-label>
                    {{ habitat.label }}
                  </va-list-item-label>
                </va-list-item-section>

                <va-list-item-section icon>
                  <va-chip size="small">{{ habitat.value }}</va-chip>
                </va-list-item-section>
              </va-list-item>
              <va-list-separator v-if="i < habitats.length - 1" :key="i" class="my-1" />
            </template>
          </va-list>
        </va-card-content>
      </va-card>
    </div>
  </div>
</template>
<script setup lang="ts">
  import StatisticsService from '../../services/clients/StatisticsService'
  import { onMounted, ref } from 'vue'
  import ContributorList from '../../components/stats/ContributorList.vue'
  import { Contributor } from '../../data/types'
  import { useBioSampleStore } from '../../stores/biosample-store'
  import DateLineChart from '../../components/charts/DateLineChart.vue'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const biosampleStore = useBioSampleStore()

  function getSubmitters(value: Contributor[]) {
    biosampleStore.gals = [...value]
  }

  const habitats = ref([])

  onMounted(async () => {
    const { data } = await StatisticsService.getModelFieldStats('biosamples', { field: 'metadata.habitat' })
    habitats.value = Object.keys(data)
      .map((k: string) => {
        return { label: k, value: data[k] }
      })
      .sort((a, b) => b.value - a.value)
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
