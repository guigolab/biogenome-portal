<template>
  <InfoBlock :charts="bioSampleInfoBlocks"/>
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
  import ContributorList from '../../components/stats/ContributorList.vue'
  import DateLineChart from '../../components/charts/DateLineChart.vue'
  import {bioSampleInfoBlocks} from '../../../config.json'

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
